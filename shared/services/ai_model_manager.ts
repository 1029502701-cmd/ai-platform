import type { ModelConfig } from './ai_provider_types';

// Model Manager: loads models from D1 (env.DB) with KV caching (env.USER_CACHE)
// Exposes getModel, listModels, create/update/setStatus, invalidateCache

const inMemory: Record<string, ModelConfig> = {};

export async function loadModelsFromBindings(env?: any): Promise<void> {
  // try KV cache
  try {
    const kv = env?.USER_CACHE;
    if (kv && kv.get) {
      const raw = await kv.get('models_json');
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const m of parsed) {
          inMemory[m.modelId] = m;
        }
        return;
      }
    }
  } catch (e) {
    // ignore
  }

  // fallback to D1
  try {
    const db = env?.DB;
    if (db && db.prepare) {
      const res = await db.prepare("SELECT model_id, provider, provider_model_name, default_params, priority, status FROM ai_models WHERE 1").all();
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
          inMemory[cfg.modelId] = cfg;
        }
      }
    }
  } catch (e) {
    // ignore DB failures
  }
}

export async function invalidateModelsCache(env?: any): Promise<void> {
  try {
    const kv = env?.USER_CACHE;
    if (kv && kv.put) {
      await kv.put('models_json', '');
    }
  } catch (e) {
    // ignore
  }
  // reload from DB
  await loadModelsFromBindings(env);
}

export function getModelFromMemory(modelId: string): ModelConfig | null {
  return inMemory[modelId] || null;
}

export function listModelsFromMemory(): ModelConfig[] {
  return Object.values(inMemory);
}

export async function createOrUpdateModelInDB(env: any, payload: { modelId: string; provider: string; providerModelName: string; defaultParams?: Record<string, unknown>; priority?: number; status?: string; displayName?: string; modelType?: string; maxTokens?: number; contextLimit?: number; costConfig?: Record<string, unknown>; }) {
  const db = env?.DB;
  if (!db || !db.prepare) throw new Error('DB_NOT_AVAILABLE');
  // upsert using simple SQL: if exists update else insert
  const upsertSql = `INSERT INTO ai_models (model_id, provider, provider_model_name, default_params, priority, status)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(model_id) DO UPDATE SET provider = excluded.provider, provider_model_name = excluded.provider_model_name, default_params = excluded.default_params, priority = excluded.priority, status = excluded.status`;
  await db.prepare(upsertSql).run(payload.modelId, payload.provider, payload.providerModelName, payload.defaultParams ? JSON.stringify(payload.defaultParams) : null, payload.priority ?? 0, payload.status ?? 'active');
  // refresh cache
  await invalidateModelsCache(env);
}

export async function setModelStatusInDB(env: any, modelId: string, status: string) {
  const db = env?.DB;
  if (!db || !db.prepare) throw new Error('DB_NOT_AVAILABLE');
  await db.prepare('UPDATE ai_models SET status = ? WHERE model_id = ?').run(status, modelId);
  await invalidateModelsCache(env);
}
