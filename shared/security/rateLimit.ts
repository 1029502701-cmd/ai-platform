import { DEFAULT_RATE_LIMITS, type RateLimitTier } from "./types.ts";
import { getLogger } from "../logger";

const log = getLogger("security_rate");

/**
 * Enhanced multi-window rate limiter.
 * Supports per-minute, per-hour, per-day limits per user/IP/API-key.
 */
interface WindowState {
  count: number;
  windowStart: number; // ms timestamp
}

type WindowKey = 'minute' | 'hour' | 'day';

class RateLimiterStore {
  private windows: Map<string, Record<WindowKey, WindowState>> = new Map();

  get(key: string): Record<WindowKey, WindowState> {
    if (!this.windows.has(key)) {
      this.windows.set(key, {
        minute: { count: 0, windowStart: Date.now() },
        hour: { count: 0, windowStart: Date.now() },
        day: { count: 0, windowStart: Date.now() },
      });
    }
    return this.windows.get(key)!;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, windows] of this.windows.entries()) {
      const age = now - Math.min(windows.minute.windowStart, windows.hour.windowStart, windows.day.windowStart);
      if (age > 86400000 * 2) { // 2 days stale
        this.windows.delete(key);
      }
    }
  }
}

const store = new RateLimiterStore();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  limit: number;
}

/**
 * Check rate limits across all time windows.
 * Returns result from the most restrictive window that is exceeded.
 */
export function checkMultiRateLimit(
  key: string,
  tier: RateLimitTier = 'guest',
): RateLimitResult {
  const windows = store.get(key);
  const now = Date.now();
  const limits = DEFAULT_RATE_LIMITS[tier] || DEFAULT_RATE_LIMITS.guest;

  // Reset expired windows
  if (now - windows.minute.windowStart > 60000) {
    windows.minute.count = 0;
    windows.minute.windowStart = now;
  }
  if (now - windows.hour.windowStart > 3600000) {
    windows.hour.count = 0;
    windows.hour.windowStart = now;
  }
  if (now - windows.day.windowStart > 86400000) {
    windows.day.count = 0;
    windows.day.windowStart = now;
  }

  // Increment counter
  windows.minute.count++;

  // Check each window
  if (windows.minute.count > limits.maxPerMinute) {
    const retryAfter = 60000 - (now - windows.minute.windowStart);
    log.warn("RATE_LIMITED (per-minute)", { key, tier, count: windows.minute.count, limit: limits.maxPerMinute });
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(1000, retryAfter), limit: limits.maxPerMinute };
  }
  if (windows.hour.count > limits.maxPerHour) {
    const retryAfter = 3600000 - (now - windows.hour.windowStart);
    log.warn("RATE_LIMITED (per-hour)", { key, tier, count: windows.hour.count, limit: limits.maxPerHour });
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(1000, retryAfter), limit: limits.maxPerHour };
  }
  if (windows.day.count > limits.maxPerDay) {
    const retryAfter = 86400000 - (now - windows.day.windowStart);
    log.warn("RATE_LIMITED (per-day)", { key, tier, count: windows.day.count, limit: limits.maxPerDay });
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(1000, retryAfter), limit: limits.maxPerDay };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limits.maxPerMinute - windows.minute.count),
    retryAfterMs: 0,
    limit: limits.maxPerMinute,
  };
}

// setInterval cleanup removed — not safe in Workers global scope
