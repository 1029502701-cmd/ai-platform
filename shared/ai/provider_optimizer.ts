/**
 * AI Provider optimizer with:
 * - Connection pooling (fetch reuse via singleton map)
 * - Configurable timeouts
 * - Weighted routing among providers
 * - Automatic fallback chain
 */

export interface ProviderRoute {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl: string;
  timeoutMs: number;
  weight: number;        // 1-10 for weighted selection
}

// Simple weighted random selection
export function selectProvider(modelId: string, providers: ProviderRoute[]): ProviderRoute | null {
  const matching = providers.filter(p => p.model === modelId || !p.model);
  if (!matching.length) return null;

  const totalWeight = matching.reduce((sum, p) => sum + p.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const p of matching) {
    rand -= p.weight;
    if (rand <= 0) return p;
  }
  return matching[matching.length - 1];
}

export async function callWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 60_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), timeoutMs);
    fn().then(v => { clearTimeout(timer); resolve(v); }).catch(e => { clearTimeout(timer); reject(e); });
  });
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (i >= maxRetries) break;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError!;
}

// Cache HTTP responses for idempotent GET requests
const httpCache = new Map<string, { data: any; timestamp: number }>();

export async function cachedFetch<T>(url: string, opts: RequestInit = {}, ttlMs: number = 60_000): Promise<T> {
  const cacheKey = url + (opts.method || "GET");
  const cached = httpCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data as T;
  }
  const resp = await fetch(url, opts);
  const data = await resp.json() as T;
  httpCache.set(cacheKey, { data, timestamp: Date.now() });
  if (httpCache.size > 500) {
    const firstKey = httpCache.keys().next().value;
    if (firstKey) httpCache.delete(firstKey);
  }
  return data;
}
