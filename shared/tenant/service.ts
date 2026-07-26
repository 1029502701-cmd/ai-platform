import type { Tenant, TenantSettings,  } from "./types.ts";
import { getLogger } from "../logger";
import { PLATFORM_TENANT_KEY } from "./types.ts";

const log = getLogger("tenant");

/**
 * Central Tenant Service — manages tenant lifecycle and resolution.
 * Every request must be resolved to a tenant before any business logic runs.
 */
export class TenantService {
  // In-memory cache for tenant configs (refresh TTL)
  private static cache: Map<string, { data: Tenant | null; expiresAt: number }> = new Map();
  private static readonly CACHE_TTL_MS = 60_000; // 1 minute

  /**
   * Resolve tenant from request context.
   * Priority:
   *   1. X-Tenant-ID header
   *   2. Subdomain extraction (tenantA.example.com)
   *   3. Host domain lookup
   *   4. Default tenant
   */
  static resolveTenant(request: Request, hostHeader?: string): { tenant: Tenant | null; tenantKey: string } {
    const url = new URL(request.url);

    // 1. Header-based resolution
    const headerTenantId = request.headers.get("X-Tenant-ID");
    if (headerTenantId) {
      return { tenant: null, tenantKey: headerTenantId }; // fetched in async method
    }

    // 2. Subdomain resolution
    const hostname = hostHeader || url.hostname;
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      // e.g., tenantA.example.com → tenantA
      const subdomain = parts[0];
      if (subdomain !== 'www' && subdomain !== 'api') {
        return { tenant: null, tenantKey: subdomain };
      }
    }

    // 3. Default platform tenant
    return { tenant: null, tenantKey: PLATFORM_TENANT_KEY };
  }

  /**
   * Load tenant by key asynchronously (DB-backed).
   */
  static async getTenantByKey(env: any, tenantKey: string): Promise<Tenant | null> {
    const db = env?.DB;
    if (!db?.prepare) return null;

    // Check cache
    const cached = this.cache.get(tenantKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    try {
      const row: any = await db.prepare(
        "SELECT * FROM tenants WHERE tenant_key = ? AND status != '" + "'deleted'" + "'"
      ).bind(tenantKey).first();

      const result: Tenant | null = row ? {
        id: row.id,
        tenantKey: row.tenant_key,
        name: row.name,
        slug: row.slug,
        status: row.status as Tenant['status'],
        plan: row.plan as Tenant['plan'],
        ownerId: row.owner_user_id,
        domain: row.domain,
        logo: row.logo,
        settings: row.settings ? JSON.parse(row.settings) : {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } : null;

      // Cache it
      this.cache.set(tenantKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return result;
    } catch (e) {
      log.error("Tenant load failed", { tenantKey, error: String(e) });
      return null;
    }
  }

  /**
   * Create a new tenant.
   */
  static async createTenant(env: any, params: {
    name: string;
    key: string;
    slug: string;
    plan?: string;
    ownerId: number;
    domain?: string;
  }): Promise<Tenant | null> {
    const db = env?.DB;
    if (!db?.prepare) return null;

    try {
      const res: any = await db.prepare(
        "INSERT INTO tenants (tenant_key, name, slug, plan, owner_user_id, domain, settings) VALUES (?, ?, ?, '" + "'free'" + "', ?, '" + "'active'" + "', ?, ?)"
      ).run(params.key, params.name, params.slug, params.ownerId, params.domain || null, JSON.stringify({}));

      const tenant: Tenant = {
        id: res.lastInsertRowid as number,
        tenantKey: params.key,
        name: params.name,
        slug: params.slug,
        status: 'active',
        plan: (params.plan || 'free') as any,
        ownerId: params.ownerId,
        domain: params.domain,
        settings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Invalidate cache
      this.cache.delete(params.key);
      log.info("Tenant created", { tenantKey: params.key });
      return tenant;
    } catch (e) {
      log.error("Tenant creation failed", { tenantKey: params.key, error: String(e) });
      return null;
    }
  }

  /**
   * Update tenant settings.
   */
  static async updateSettings(env: any, tenantKey: string, settings: Partial<TenantSettings>): Promise<boolean> {
    const db = env?.DB;
    if (!db?.prepare) return false;

    try {
      await db.prepare(
        "UPDATE tenants SET settings = ?, updated_at = datetime('now') WHERE tenant_key = ?"
      ).run(JSON.stringify(settings), tenantKey);

      this.cache.delete(tenantKey);
      return true;
    } catch (e) {
      log.error("Update tenant settings failed", { tenantKey, error: String(e) });
      return false;
    }
  }

  /**
   * Get resolved tenant for a given request.
   * Returns a full Tenant object or the default platform tenant.
   */
  static async resolveAndLoad(env: any, request: Request, hostHeader?: string): Promise<{ tenant: Tenant | null; tenantKey: string }> {
    const resolved = this.resolveTenant(request, hostHeader);
    const tenant = resolved.tenantKey === PLATFORM_TENANT_KEY
      ? null // Platform has no tenant row
      : await this.getTenantByKey(env, resolved.tenantKey);

    return { tenant: tenant || null, tenantKey: resolved.tenantKey };
  }

  /**
   * Clear all cached tenants.
   */
  static clearCache(): void {
    this.cache.clear();
    log.info("Tenant cache cleared");
  }

  /**
   * Purge cache for a single tenant.
   */
  static purgeCache(tenantKey: string): void {
    this.cache.delete(tenantKey);
  }
}


