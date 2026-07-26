// ============================================
// RBAC — Role-Based Access Control
// Ported from shared/auth/authorization_rbac.ts with enhancements
// ============================================

import type { AuthEnv, RoleId, PermissionId } from './types';

const CACHE_TTL = 300; // 5 minutes

function userRolesCacheKey(userId: string): string { return user:roles:; }
function rolePermsCacheKey(roleId: string): string { return ole:perms:; }

// --- Role hierarchy (built-in) ---

export const BUILTIN_ROLES: Record<string, { name: string; level: number }> = {
  'role_super_admin': { name: '超级管理员', level: 100 },
  'role_admin':        { name: '管理员',     level: 50 },
  'role_user':         { name: '普通用户',   level: 10 },
  'role_guest':        { name: '游客',       level: 1 },
};

// --- Role Assignment ---

export async function assignRole(env: AuthEnv, userId: string, roleId: RoleId): Promise<void> {
  await env.DB.prepare(
    INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)
  ).bind(userId, roleId).run();
  await invalidateUserRolesCache(env, userId);
}

export async function removeRole(env: AuthEnv, userId: string, roleId: RoleId): Promise<void> {
  await env.DB.prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?').bind(userId, roleId).run();
  await invalidateUserRolesCache(env, userId);
}

export async function getUserRoles(env: AuthEnv, userId: string): Promise<RoleId[]> {
  if (!userId) return [];
  const cached = await getCached<RoleId[]>(env, userRolesCacheKey(userId));
  if (cached) return cached;

  const res = await env.DB.prepare('SELECT role_id FROM user_roles WHERE user_id = ?').bind(userId).all();
  const roles: RoleId[] = (res.results || []).map((r: any) => r.role_id);

  await setCached(env, userRolesCacheKey(userId), roles);
  return roles;
}

export async function getRolePermissions(env: AuthEnv, roleId: string): Promise<PermissionId[]> {
  const cached = await getCached<PermissionId[]>(env, rolePermsCacheKey(roleId));
  if (cached) return cached;

  const res = await env.DB.prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?').bind(roleId).all();
  const perms: PermissionId[] = (res.results || []).map((r: any) => r.permission_id);

  await setCached(env, rolePermsCacheKey(roleId), perms);
  return perms;
}

export async function getUserPermissions(env: AuthEnv, userId: string): Promise<Set<PermissionId>> {
  const roles = await getUserRoles(env, userId);
  const perms = new Set<PermissionId>();

  for (const r of roles) {
    const rp = await getRolePermissions(env, r);
    rp.forEach(p => perms.add(p));
  }

  // Super admin always has everything
  if (roles.includes('role_super_admin')) {
    const allRes = await env.DB.prepare('SELECT permission_id FROM permissions').all();
    (allRes.results || []).forEach((r: any) => perms.add(r.permission_id));
  }

  return perms;
}

// --- Checks ---

export async function hasRole(env: AuthEnv, userId: string, roleId: string): Promise<boolean> {
  const roles = await getUserRoles(env, userId);
  return roles.includes(roleId);
}

export async function hasRoleLevel(env: AuthEnv, userId: string, minLevel: number): Promise<boolean> {
  const roles = await getUserRoles(env, userId);
  return roles.some(r => {
    const info = BUILTIN_ROLES[r];
    return info && info.level >= minLevel;
  });
}

export async function hasPermission(env: AuthEnv, userId: string, permission: PermissionId): Promise<boolean> {
  const perms = await getUserPermissions(env, userId);
  return perms.has(permission);
}

export function checkRoleIdLevel(roleId: string, minLevel: number): boolean {
  const info = BUILTIN_ROLES[roleId];
  return !!info && info.level >= minLevel;
}

// --- Cache Invalidation ---

export async function invalidateUserRolesCache(env: AuthEnv, userId: string): Promise<void> {
  try { await env.USER_CACHE.delete(userRolesCacheKey(userId)); } catch (_) {}
}

export async function invalidateRolePermsCache(env: AuthEnv, roleId: string): Promise<void> {
  try { await env.USER_CACHE.delete(rolePermsCacheKey(roleId)); } catch (_) {}
}

// --- Helpers ---

async function getCached<T>(env: AuthEnv, key: string): Promise<T | null> {
  try {
    const data = await env.USER_CACHE.get(key, 'json') as T | null;
    return data as T;
  } catch (_) { return null; }
}

async function setCached(env: AuthEnv, key: string, value: unknown): Promise<void> {
  try {
    await env.USER_CACHE.put(key, JSON.stringify(value), { expirationTtl: CACHE_TTL });
  } catch (_) {}
}
