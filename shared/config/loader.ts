/**
 * Environment-aware configuration loader.
 * Reads from Cloudflare Workers environment variables (wrangler.toml [vars] / Pages secrets).
 * Provides a single `envConfig` object to all modules.
 */

export type EnvMode = 'local' | 'development' | 'testing' | 'staging' | 'production';

interface Config {
  mode: EnvMode;
  apiVersion: string;
  defaultAiProvider: string;
  fallbackAiProviders: string[];
  taskExecutionTimeoutMs: number;
  staleRunningMs: number;
  maxQueueWorkers: number;
  isDev: boolean;
  isProd: boolean;
}

// Default config — overridden by env vars at runtime
const defaults: Config = {
  mode: 'production',
  apiVersion: 'v1',
  defaultAiProvider: 'openai',
  fallbackAiProviders: ['anthropic', 'gemini', 'deepseek'],
  taskExecutionTimeoutMs: 300000, // 5 min
  staleRunningMs: 7200000, // 2h
  maxQueueWorkers: 4,
  isDev: false,
  isProd: true,
};

/**
 * Load configuration from Cloudflare Workers env.
 * Called once per request — cheap memoization via closure.
 */
let cachedConfig: Config | null = null;

export function loadConfig(env?: any): Config {
  if (cachedConfig && !env?.RELOAD_CONFIG) return cachedConfig;

  const cfg: Config = { ...defaults };

  // Override with env vars if available
  if (env) {
    const e = env as Record<string, string>;
    cfg.mode = ((e.NODE_ENV || '') === 'production') ? 'production' : 'development';
    cfg.isDev = cfg.mode !== 'production';
    cfg.isProd = cfg.mode === 'production';
    cfg.apiVersion = e.API_VERSION || cfg.apiVersion;
    cfg.defaultAiProvider = e.DEFAULT_AI_PROVIDER || cfg.defaultAiProvider;
    cfg.fallbackAiProviders = (e.FALLBACK_AI_PROVIDERS || '').split(',').filter(Boolean);
    cfg.taskExecutionTimeoutMs = parseInt(e.TASK_EXECUTION_TIMEOUT_MS || String(cfg.taskExecutionTimeoutMs));
    cfg.staleRunningMs = parseInt(e.STALE_RUNNING_MS || String(cfg.staleRunningMs));
    cfg.maxQueueWorkers = parseInt(e.MAX_QUEUE_WORKERS || String(cfg.maxQueueWorkers));
  }

  cachedConfig = cfg;
  return cfg;
}

/**
 * Force re-read config from env (useful for tests).
 */
export function reloadConfig(): void {
  cachedConfig = null;
}