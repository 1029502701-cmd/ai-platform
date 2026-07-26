// Model Registry - Loads and manages AI model configurations from D1/KV

import type { ModelConfig } from './types/index';

const registry: Map<string, ModelConfig> = new Map();

export async function loadRegistryFromDB(env?: any): Promise<void> {
  try {
    // Try KV cache first
    const kv = env?.USER_CACHE;
    if (kv && kv.get) {
      const raw = await kv.get('models_json');
      if (raw) {
        const parsed: ModelConfig[] = JSON.parse(raw);
        for (const m of parsed) registry.set(m.modelId, m);
        return;
      }
    }
  } catch (_) {}

  // Fallback to D1
  try {
    const db = env?.DB;
    if (!db || !db.prepare) return;

    const res = await db.prepare(
      'SELECT model_id, provider, provider_model_name, default_params, priority, region_whitelist as regionWhitelist, status, display_name as displayName, context_limit as contextLimit, cost_config as costConfig FROM ai_models WHERE status = ''active'''
    ).all();

    if (res && res.results) {
      for (const row of res.results) {
        registry.set(row.model_id, {
          modelId: row.model_id,
          provider: row.provider,
          providerModelName: row.provider_model_name,
          defaultParams: row.default_params ? JSON.parse(row.default_params) : undefined,
          priority: row.priority ?? 0,
          regionWhitelist: row.regionWhitelist ? JSON.parse(row.regionWhitelist) : undefined,
          status: row.status as 'active' | 'disabled',
          displayName: row.displayName,
          contextLimit: row.contextLimit,
          costConfig: row.costConfig ? JSON.parse(row.costConfig) : undefined,
        });
      }
    }
  } catch (_) {
    // ignore DB errors for now
  }
}

export async function registerModel(cfg: ModelConfig): Promise<void> {
  registry.set(cfg.modelId, cfg);
}

export function getModelConfig(modelId: string): ModelConfig | null {
  return registry.get(modelId) || null;
}

export function listActiveModels(): ModelConfig[] {
  return Array.from(registry.values()).filter(m => m.status === 'active');
}

export async function invalidateCache(env?: any): Promise<void> {
  try {
    const kv = env?.USER_CACHE;
    if (kv && kv.put) {
      await kv.put('models_json', '');
    }
  } catch (_) {}
  registry.clear();
}

export async function seedExampleModel(env?: any): Promise<void> {
  if (!registry.has('mock-text-1')) {
    registry.set('mock-text-1', {
      modelId: 'mock-text-1',
      provider: 'mock',
      providerModelName: 'mock-1',
      defaultParams: { temperature: 0.7 },
      priority: 10,
      status: 'active',
      displayName: 'Mock Text Generator',
    });
  }
}
