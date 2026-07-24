import type { PermissionId, RoleId } from './authorization_rbac_types';
import type { AuthEnv } from "./types";

const USER_ROLES_CACHE_TTL_SECONDS = 300;
const ROLE_PERMS_CACHE_TTL_SECONDS = 300;

function userRolesCacheKey(userId: string): string {
  return `user:roles:${userId}`;
}

function rolePermsCacheKey(roleId: string): string {
  return `role:perms:${roleId}`;
}

// RBAC helpers using D1 (env.DB) and KV cache (env.USER_CACHE)
export async function getUserRoles(env: AuthEnv, userId: string): Promise<RoleId[]> {
  if (!userId) return [];
  const kvKey = userRolesCacheKey(userId);
  try {
    const cached = (await env.USER_CACHE.get(kvKey, { type: 'json' })) as string[] | null;
    if (cached && Array.isArray(cached)) return cached;
  } catch (error) {
    console.error("[authz] Failed to read user roles cache", { userId, error });
  }

  const res = await env.DB.prepare('SELECT role_id FROM user_roles WHERE user_id = ?').bind(userId).all();
  const roles: RoleId[] = (res.results || []).map((r: any) => r.role_id);
  try {
    await env.USER_CACHE.put(kvKey, JSON.stringify(roles), { expirationTtl: USER_ROLES_CACHE_TTL_SECONDS });
  } catch (error) {
    console.error("[authz] Failed to write user roles cache", { userId, error });
  }
  return roles;
}

export async function getRolePermissions(env: AuthEnv, roleId: string): Promise<PermissionId[]> {
  const kvKey = rolePermsCacheKey(roleId);
  try {
    const cached = (await env.USER_CACHE.get(kvKey, { type: 'json' })) as string[] | null;
    if (cached && Array.isArray(cached)) return cached;
  } catch (error) {
    console.error("[authz] Failed to read role permissions cache", { roleId, error });
  }

  const res = await env.DB.prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?').bind(roleId).all();
  const perms: PermissionId[] = (res.results || []).map((r: any) => r.permission_id);
  try {
    await env.USER_CACHE.put(kvKey, JSON.stringify(perms), { expirationTtl: ROLE_PERMS_CACHE_TTL_SECONDS });
  } catch (error) {
    console.error("[authz] Failed to write role permissions cache", { roleId, error });
  }
  return perms;
}

export async function getUserPermissions(env: AuthEnv, userId: string): Promise<Set<PermissionId>> {
  const roles = await getUserRoles(env, userId);
  const permsSet = new Set<PermissionId>();
  for (const r of roles) {
    const perms = await getRolePermissions(env, r);
    for (const p of perms) permsSet.add(p);
  }
  return permsSet;
}

export async function hasRole(env: AuthEnv, userId: string, roleId: string): Promise<boolean> {
  const roles = await getUserRoles(env, userId);
  return roles.includes(roleId);
}

export async function hasPermission(env: AuthEnv, userId: string, permission: string): Promise<boolean> {
  const perms = await getUserPermissions(env, userId);
  if (perms.has(permission)) return true;
  if (await hasRole(env, userId, 'role_super_admin')) return true;
  return false;
}

export async function invalidateUserRolesCache(env: AuthEnv, userId: string) {
  try {
    await env.USER_CACHE.delete(userRolesCacheKey(userId));
  } catch (error) {
    console.error("[authz] Failed to clear user roles cache", { userId, error });
  }
}

export async function invalidateRolePermsCache(env: AuthEnv, roleId: string) {
  try {
    await env.USER_CACHE.delete(rolePermsCacheKey(roleId));
  } catch (error) {
    console.error("[authz] Failed to clear role permissions cache", { roleId, error });
  }
}
