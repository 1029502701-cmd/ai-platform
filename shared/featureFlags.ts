import { getLogger } from "./logger/index.ts";

const log = getLogger("feature_flags");

/**
 * Feature flag service — database-backed with KV cache.
 * Supports per-tenant, per-user, and percentage rollout.
 */

export interface FeatureFlag {
  id: number;
  key: string;
  enabled: boolean;
  targetTenant?: number | null;
  targetUserId?: number | null;
  rolloutPercentage: number; // 0-100
  createdAt: string;
}

/**
 * Check if a feature is enabled for a given context.
 */
export async function isFeatureEnabled(env: any, featureKey: string, options?: { tenantId?: number; userId?: number }): Promise<boolean> {
  const db = env?.DB;
  const kv = env?.FEATURE_FLAGS;

  // Quick KV cache check
  if (kv) {
    try {
      const cached = await kv.get(`flag:${featureKey}`, { type: 'json' }) as boolean | null;
      if (cached !== null) return cached;
    } catch {}
  }

  // Database query
  if (!db?.prepare) {
    log.info("No DB available, defaulting to enabled", { featureKey });
    return true; // Default: enable feature if no config exists
  }

  try {
    const flag: any = await db.prepare(
      "SELECT enabled, target_tenant_id, target_user_id, rollout_percentage FROM feature_flags WHERE key = ? AND status = 'active'"
    ).bind(featureKey).first();

    if (!flag) return true; // No flag configured → enabled by default

    // Global toggle
    if (!flag.enabled) return false;

    // Tenant-specific override
    if (options?.tenantId && flag.target_tenant_id && flag.target_tenant_id !== options.tenantId) return false;

    // User-specific override
    if (options?.userId && flag.target_user_id && flag.target_user_id !== options.userId) return false;

    // Percentage rollout (deterministic hash based on user ID or random seed)
    if (flag.rollout_percentage > 0 && flag.rollout_percentage < 100) {
      const seed: string = options?.userId ? String(options.userId) : Math.random().toString();
      const hash = hashCode(seed);
      const percentage = ((hash % 10000) / 10000) * 100;
      if (percentage > flag.rollout_percentage) return false;
    }

    // Cache result in KV
    if (kv) {
      try { await kv.put(`flag:${featureKey}`, JSON.stringify(flag.enabled), { expirationTtl: 60 }); } catch {}
    }

    return true;
  } catch (e) {
    log.error("Feature flag check failed, defaulting to enabled", { featureKey, error: String(e) });
    return true;
  }
}

/**
 * Simple deterministic hash for percentage rollout.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
