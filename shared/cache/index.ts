/**
 * Unified Cache Layer
 * Supports Memory Cache (default), KV Cache (production), and inline cache headers.
 */

// --------------- In-Memory Cache (per-worker singleton) ---------------
interface CacheEntry<T> {
  value: T;
  expiresAt: number;       // ms timestamp
}
const memoryStore = new Map<string, CacheEntry<unknown>>();

const TTL_DEFAULT_MS = 5 * 60 * 1000; // 5 min
const TTL_SHORT_MS = 60 * 1000;        // 1 min
const TTL_LONG_MS = 30 * 60 * 1000;    // 30 min
const TTL_SETTINGS_MS = 24 * 60 * 60 * 1000; // 24h

function memoryGet<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memoryStore.delete(key); return null; }
  return entry.value as T;
}

function memorySet<T>(key: string, value: T, ttlMs: number): void {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function memoryDelete(key: string): void { memoryStore.delete(key); }

function memoryClear(): void { memoryStore.clear(); }

// --------------- KV Cache wrapper ---------------
async function kvGet<T>(kv: any, key: string): Promise<T | null> {
  if (!kv?.get) return null;
  try {
    const raw = await kv.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch { return null; }
}

async function kvSet(kv: any, _key: string, value: unknown, expirationTtl?: number): Promise<void> {
  if (!kv?.put) return;
  try {
    await kv.put(JSON.stringify(value), { expirationTtl });
  } catch { /* ignore */ }
}



// --------------- Key builders ---------------
const KC = {
  settings: () => "cache:settings",
  scenarios: () => "cache:scenarios",
  prompts: () => "cache:prompts",
  models: () => "cache:models",
  providers: () => "cache:providers",
  knowledgeBases: () => "cache:kbs",
  kbBase: (key: string) => `cache:kb:${key}`,
  healthCheck: (name: string) => `cache:health:${name}`,
};

// --------------- Public API ---------------
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlMs?: number, kv?: any): Promise<void>;
  invalidate(key: string): void;
  clearAll(): void;
}

export class DefaultCache implements CacheService {
  async get<T>(key: string): Promise<T | null> {
    // Try KV first, then memory
    const envKey = typeof globalThis !== "undefined" ? (globalThis as any).__CACHE_KV__ : null;
    if (envKey) {
      const kvVal = await kvGet<T>(envKey, key);
      if (kvVal) { memorySet(key, kvVal, TTL_DEFAULT_MS); return kvVal; }
    }
    return memoryGet<T>(key);
  }

  async set(key: string, value: unknown, ttlMs = TTL_DEFAULT_MS, kv?: any): Promise<void> {
    memorySet(key, value, ttlMs);
    if (kv) await kvSet(kv, key, value, Math.ceil(ttlMs / 1000));
  }

  invalidate(key: string): void { memoryDelete(key); }
  clearAll(): void { memoryClear(); }
}

// Pre-defined cached getters
export async function cachedSettings(cache: DefaultCache, env?: any): Promise<any> {
  const key = KC.settings();
  let val = await cache.get(key);
  if (!val) {
    // Fetch from DB
    try {
      const db = env?.DB;
      if (db?.prepare) {
        const rows: any[] = await db.prepare("SELECT setting_key, setting_value FROM system_settings").all();
        val = Object.fromEntries((rows || []).map(r => [r.setting_key, r.setting_value]));
        await cache.set(key, val, TTL_SETTINGS_MS, env?.USER_CACHE);
      }
    } catch {}
  }
  return val;
}

export async function cachedScenarios(cache: DefaultCache, env?: any): Promise<any[]> {
  const key = KC.scenarios();
  let val = await cache.get(key);
  if (!val) {
    try {
      const db = env?.DB;
      if (db?.prepare) {
        const rows: any[] = await db.prepare("SELECT key, name, default_model_id, temperature, max_tokens, supported_model_ids, status FROM ai_scenarios ORDER BY priority DESC").all();
        val = (rows || []).map((r: any) => ({
          key: r.key,
          name: r.name,
          defaultModelId: r.default_model_id,
          temperature: r.temperature,
          maxTokens: r.max_tokens,
          supportedModels: r.supported_model_ids ? JSON.parse(r.supported_model_ids) : [],
          enabled: r.status === 'active',
        }));
        await cache.set(key, val, TTL_LONG_MS, env?.USER_CACHE);
      }
    } catch {}
  }
  return (val || []) as any[];
}

export async function cachedModels(cache: DefaultCache, env?: any): Promise<any[]> {
  const key = KC.models();
  let val = await cache.get(key);
  if (!val) {
    try {
      const db = env?.DB;
      if (db?.prepare) {
        const rows: any[] = await db.prepare("SELECT id, name, provider, provider_model_name, status, priority, config_json, daily_request_limit, token_limit FROM ai_models WHERE status IN ('active','default') ORDER BY priority DESC").all();
        val = (rows || []).map((r: any) => ({
          ...r, config: r.config_json ? JSON.parse(r.config_json) : {},
        }));
        await cache.set(key, val, TTL_LONG_MS, env?.USER_CACHE);
      }
    } catch {}
  }
  return (val || []) as any[];
}

export async function cachedProviders(cache: DefaultCache, env?: any): Promise<any[]> {
  const key = KC.providers();
  let val = await cache.get(key);
  if (!val) {
    try {
      const db = env?.DB;
      if (db?.prepare) {
        const rows: any[] = await db.prepare("SELECT id, key, name, type, status, config_json FROM ai_providers ORDER BY id").all();
        val = (rows || []).map((r: any) => ({
          ...r, config: r.config_json ? JSON.parse(r.config_json) : {},
        }));
        await cache.set(key, val, TTL_LONG_MS, env?.USER_CACHE);
      }
    } catch {}
  }
  return (val || []) as any[];
}

// Expose KV reference globally for middleware access
(globalThis as any).__CACHE_KV__ = null;

export { KC, TTL_DEFAULT_MS, TTL_SHORT_MS, TTL_LONG_MS, TTL_SETTINGS_MS };
