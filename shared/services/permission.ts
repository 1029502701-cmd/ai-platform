import * as authz from "../auth/authorization_rbac";
import type { AuthEnv } from "../auth/types";

export const PermissionService = authz;

export async function requirePermission(env: AuthEnv, userId: string, permission: string) {
  return authz.hasPermission(env, userId, permission);
}

// Convenience helper for Pages Functions to validate role from request context.
// It will first check for an X-Admin header (testing/dev), then try to extract user id from cookie and call authz.hasRole.
export async function hasRoleForRequest(role: string, ctx: { env: AuthEnv; request: Request }): Promise<boolean> {
  try {
    const header = ctx.request.headers.get('X-Admin');
    if (header === 'true') return true;
    // try to read user id from cookie 'session_user' (this is a lightweight heuristic; production should use session lookup)
    const cookie = ctx.request.headers.get('Cookie') || '';
    const match = cookie.match(/session_user=([^;\s]+)/);
    const userId = match ? decodeURIComponent(match[1]) : null;
    if (!userId) return false;
    return await authz.hasRole(ctx.env, userId, role);
  } catch (e) {
    return false;
  }
}
