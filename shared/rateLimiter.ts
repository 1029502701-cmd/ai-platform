/**
 * Token Bucket Rate Limiter using KV or in-memory fallback.
 */

interface BucketState {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, BucketState>();

export interface RateLimitConfig {
  maxTokens: number;      // bucket capacity
  refillRate: number;     // tokens per second
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  anonymous: { maxTokens: 10, refillRate: 1 / 60 },
  authenticated: { maxTokens: 60, refillRate: 1 },
  admin: { maxTokens: 200, refillRate: 5 },
};

function refill(state: BucketState, config: RateLimitConfig): void {
  const now = Date.now();
  const elapsed = (now - state.lastRefill) / 1000;
  state.tokens = Math.min(config.maxTokens, state.tokens + elapsed * config.refillRate);
  state.lastRefill = now;
}

export async function checkRateLimit(
  key: string,
  _userId?: string,
  kv?: any,
  tier: "anonymous" | "authenticated" | "admin" = "anonymous",
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = DEFAULT_CONFIGS[tier] || DEFAULT_CONFIGS.anonymous;
  const cacheKey = `ratelimit:${key}`;

  if (kv?.get && kv.put) {
    try {
      const raw = await kv.get(cacheKey);
      if (raw) {
        const prev: BucketState = JSON.parse(raw);
        refill(prev, config);
        if (prev.tokens < 1) return { allowed: false, remaining: 0, resetAt: prev.lastRefill + 1000 / config.refillRate };
        prev.tokens -= 1;
        await kv.put(cacheKey, JSON.stringify(prev), { expirationTtl: 60 });
        return { allowed: true, remaining: Math.floor(prev.tokens), resetAt: prev.lastRefill + 1000 };
      }
    } catch { /* fall through to memory */ }
  }

  let st = buckets.get(key);
  if (!st) { st = { tokens: config.maxTokens, lastRefill: Date.now() }; buckets.set(key, st); }
  refill(st, config);

  if (st.tokens < 1) {
    return { allowed: false, remaining: 0, resetAt: st.lastRefill + 1000 };
  }
  st.tokens -= 1;
  return { allowed: true, remaining: Math.floor(st.tokens), resetAt: st.lastRefill + 1000 };
}
// setInterval cleanup removed — not safe in Workers global scope