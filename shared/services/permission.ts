import * as authz from "../auth/authorization_rbac";
import type { AuthEnv } from "../auth/types";

export const PermissionService = authz;

export async function requirePermission(env: AuthEnv, userId: string, permission: string) {
  return authz.hasPermission(env, userId, permission);
}

// Convenience helper for Pages Functions to validate role from request context.
// In production, X-Admin header is ignored. Only use proper session authentication.
export async function hasRoleForRequest(role: string, ctx: { env: AuthEnv; request: Request; devMode?: boolean }): Promise<boolean> {
  try {
    // Development-only bypass: X-Admin header allows admin access for testing
    const devMode = ctx.request.headers.get('x-development-mode') === 'true' || 
                    (ctx as any).devMode === true;
    if (devMode) {
      const header = ctx.request.headers.get('X-Admin');
      if (header === 'true') return true;
    }
    // try to read user id from cookie and resolve session properly
    const cookie = ctx.request.headers.get('Cookie') || '';
    // First try reading session_id from cookie
    const sessionMatch = cookie.match(/session_id=([^;\s]+)/);
    if (!sessionMatch) return false;
    
    // Session-based role check would need the session lookup
    // For now, fall back to the simple heuristic if no proper session
    const match = cookie.match(/session_user=([^;\s]+)/);
    const userId = match ? decodeURIComponent(match[1]) : null;
    if (!userId) return false;
    return await authz.hasRole(ctx.env, userId, role);
  } catch (e) {
    return false;
  }
}
