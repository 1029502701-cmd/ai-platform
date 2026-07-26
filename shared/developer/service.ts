import type { ApiKey } from "./types.ts";
import { getLogger } from "../logger";
// Crypto available via global crypto object in Workers

const log = getLogger("developer_service");

/**
 * Central Developer Service — manages API keys, developer accounts, usage tracking.
 */
export class DeveloperService {
  /**
   * Create a new API key for a developer.
   */
  static async createApiKey(env: any, params: {
    developerId: number;
    name: string;
    permissions?: string[];
    dailyQuota?: number;
    monthlyQuota?: number;
  }): Promise<{ apiKey: ApiKey | null; rawKey: string | null }> {
    const db = env?.DB;
    if (!db?.prepare) return { apiKey: null, rawKey: null };

    try {
      // Generate a unique API key (similar to OpenAI format)
      const rawKey = `ak_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Store only hash (never store raw key in DB long-term)
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const res: any = await db.prepare(
        "INSERT INTO api_keys (developer_id, key_hash, name, permissions, daily_quota, monthly_quota, status) VALUES (?, ?, '" + "'" + params.name + "'" + "', ?, ?, ?, '" + "'active'" + "')"
      ).run(params.developerId, hashHex, JSON.stringify(params.permissions || []), params.dailyQuota || 0, params.monthlyQuota || 0);

      const apiKey: ApiKey = {
        id: res.lastInsertRowid as number,
        developerId: params.developerId,
        key: rawKey, // Only returned once!
        name: params.name,
        permissions: params.permissions || [],
        dailyQuota: params.dailyQuota || 0,
        monthlyQuota: params.monthlyQuota || 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      log.info("API Key created", { developerId: params.developerId, keyPrefix: rawKey.substring(0, 10) });
      return { apiKey, rawKey };
    } catch (e) {
      log.error("API Key creation failed", { error: String(e) });
      return { apiKey: null, rawKey: null };
    }
  }

  /**
   * Validate an API key against the request header.
   */
  static async validateApiKey(env: any, rawKey: string): Promise<{ valid: boolean; key: ApiKey | null }> {
    const db = env?.DB;
    if (!db?.prepare) return { valid: false, key: null };

    try {
      // Hash the provided key to match against stored hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const row: any = await db.prepare(
        "SELECT id, developer_id, name, permissions, daily_quota, monthly_quota, status, expires_at, ip_whitelist FROM api_keys WHERE key_hash = ?"
      ).bind(hashHex).first();

      if (!row) return { valid: false, key: null };

      // Check status and expiration
      if (row.status !== 'active') return { valid: false, key: null };
      if (row.expires_at && row.expires_at < new Date().toISOString()) return { valid: false, key: null };

      return { valid: true, key: row as unknown as ApiKey };
    } catch (e) {
      log.error("API Key validation failed", { error: String(e) });
      return { valid: false, key: null };
    }
  }

  /**
   * Record API usage for billing and analytics.
   */
  static async recordUsage(env: any, params: {
    developerId: number;
    apiKeyId: number;
    resourceType: string;
    endpoint: string;
    tokensUsed?: number;
    costCents?: number;
    latencyMs?: number;
    statusCode?: number;
  }): Promise<boolean> {
    const db = env?.DB;
    if (!db?.prepare) return false;

    try {
      await db.prepare(
        "INSERT INTO api_usage (developer_id, api_key_id, resource_type, endpoint, tokens_used, cost_cents, latency_ms, status_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(params.developerId, params.apiKeyId, params.resourceType, params.endpoint, params.tokensUsed || 0, params.costCents || 0, params.latencyMs || 0, params.statusCode || 200);

      return true;
    } catch (e) {
      log.error("Failed to record API usage", { error: String(e) });
      return false;
    }
  }
}
