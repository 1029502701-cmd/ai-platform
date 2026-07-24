import type { ModelConfig } from "./ai_provider_types";

// Simple in-memory registry (primary cache). In runtime we will load from D1 and use KV as cache.
const registry: Record<string, ModelConfig> = {};

// env-aware loader: pass env to load from D1/KV
export async function loadRegistryFromBindings(env?: any): Promise<void> {
  // Attempt to read a KV cached JSON first (USER_CACHE)
  try {
    const kv = env?.USER_CACHE;
    if (kv && kv.get) {
      const raw = await kv.get('models_json');
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const m of parsed) {
          registry[m.modelId] = m;
        }
        return;
      }
    }
  } catch (e) {
    // ignore cache failures
    // console.warn('AI registry cache read failed', e);
  }

  // Fallback: try to read from D1 (DB binding name: DB)
  try {
    const db = env?.DB;
    if (db && db.prepare) {
      const res = await db.prepare("SELECT model_id, provider, provider_model_name, default_params, priority, status FROM ai_models WHERE status = 'active'").all();
      if (res && res.results) {
        for (const row of res.results) {
          const cfg: ModelConfig = {
            modelId: row.model_id,
            provider: row.provider,
            providerModelName: row.provider_model_name,
            defaultParams: row.default_params ? JSON.parse(row.default_params) : undefined,
            priority: row.priority,
            status: row.status,
          };
          registry[cfg.modelId] = cfg;
        }
      }
    }
  } catch (e) {
    // ignore DB failures for now
  }
}

export async function registerModel(cfg: ModelConfig) {
  registry[cfg.modelId] = cfg;
}

export async function getModelConfig(modelId: string): Promise<ModelConfig | null> {
  return registry[modelId] || null;
}

// seed helper for local dev
export async function seedExample() {
  await registerModel({ modelId: 'mock-text-1', provider: 'mock', providerModelName: 'mock-1', defaultParams: { temperature: 0.7 }, priority: 10, status: 'active' });
}
