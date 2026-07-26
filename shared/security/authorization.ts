import type { PermissionId } from "./types.ts";
import { getLogger } from "../logger";
import { checkRateLimit } from "../rateLimiter.ts";

const log = getLogger("security");

/**
 * Permission-based authorization — the only way to check access.
 * Replaces all `role === 'admin'` checks in the codebase over time.
 */
export class AuthorizationService {
  /**
   * Check if a user has a specific permission.
   * userId and env.DB are required for DB-backed lookup.
   */
  static async hasPermission(env: any, userId: string, permission: PermissionId): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(env, userId);
      for (const roleId of userRoles) {
        const perms = await this.getRolePermissions(env, roleId);
        if (perms.has(permission)) return true;
      }
      return false;
    } catch (e) {
      log.warn("Permission check failed, denying access", { userId, permission, error: String(e) });
      return false; // Fail-closed by default
    }
  }

  /**
   * Check if user has ANY of the given permissions.
   */
  static async hasAnyPermission(env: any, userId: string, permissions: PermissionId[]): Promise<boolean> {
    for (const perm of permissions) {
      if (await this.hasPermission(env, userId, perm as PermissionId)) return true;
    }
    return false;
  }

  /**
   * Check if user has ALL of the given permissions.
   */
  static async hasAllPermissions(env: any, userId: string, permissions: PermissionId[]): Promise<boolean> {
    for (const perm of permissions) {
      if (!await this.hasPermission(env, userId, perm as PermissionId)) return false;
    }
    return true;
  }

  /**
   * Get list of permissions for a user.
   */
  static async getUserPermissions(env: any, userId: string): Promise<Set<PermissionId>> {
    try {
      const userRoles = await this.getUserRoles(env, userId);
      const permsSet = new Set<PermissionId>();
      for (const roleId of userRoles) {
        const rolePerms = await this.getRolePermissions(env, roleId);
        for (const p of rolePerms) { permsSet.add(p as PermissionId); }
      }
      return permsSet;
    } catch {
      return new Set();
    }
  }

  /**
   * Get roles for a user (from KV cache + DB).
   */
  private static async getUserRoles(env: any, userId: string): Promise<string[]> {
    try {
      const kvKey = `user:roles:${userId}`;
      const cached = await env.USER_CACHE?.get(kvKey, { type: 'json' }) as string[] | null;
      if (cached && Array.isArray(cached)) return cached;

      const res = await env.DB.prepare('SELECT role_id FROM user_roles WHERE user_id = ?').bind(userId).all();
      const roles: string[] = (res.results || []).map((r: any) => r.role_id);

      if (env.USER_CACHE?.put) {
        await env.USER_CACHE.put(kvKey, JSON.stringify(roles), { expirationTtl: 300 });
      }
      return roles;
    } catch {
      return [];
    }
  }

  /**
   * Get permissions for a role (from KV cache + DB).
   */
  private static async getRolePermissions(env: any, roleId: string): Promise<Set<string>> {
    try {
      const kvKey = `role:perms:${roleId}`;
      const cached = await env.USER_CACHE?.get(kvKey, { type: 'json' }) as string[] | null;
      if (cached && Array.isArray(cached)) return new Set(cached);

      const res = await env.DB.prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?').bind(roleId).all();
      const perms: string[] = (res.results || []).map((r: any) => r.permission_id);

      if (env.USER_CACHE?.put) {
        await env.USER_CACHE.put(kvKey, JSON.stringify(perms), { expirationTtl: 300 });
      }
      return new Set(perms);
    } catch {
      return new Set();
    }
  }
}
