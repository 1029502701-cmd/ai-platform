// ============================================
// Auth Middleware
// Express/Cloudflare Worker request handler
// ============================================

import type { AuthEnv, AuthenticatedUser, UserRole } from './types';
import { getSession, revokeSession, refreshLastSeen } from './session';
import { readSessionId, parseTokenFromHeader } from './cookies';
import { createSession as createNewSession } from './session';

export interface RequestContext {
  headers: Headers;
  env: AuthEnv;
}

/**
 * Parse authentication from incoming request.
 * Tries cookie first, then Bearer token.
 */
export async function authenticate(reqCtx: RequestContext): Promise<{ user: AuthenticatedUser | null; sessionId: string | null }> {
  const cookieHeader = reqCtx.headers.get('cookie');
  let sessionId: string | null = null;

  // Try cookie
  sessionId = readSessionId(cookieHeader);
  if (sessionId) {
    try {
      const session = await getSession(reqCtx.env, sessionId);
      if (session) {
        // Refresh last_seen for active sessions
        await refreshLastSeen(reqCtx.env, sessionId).catch(() => {});
        return { user: session.user, sessionId };
      }
    } catch (_) {}
  }

  // Try Authorization header
  const authHeader = reqCtx.headers.get('authorization');
  if (authHeader) {
    const token = parseTokenFromHeader(authHeader);
    if (token) {
      try {
        const session = await getSession(reqCtx.env, token);
        if (session) {
          return { user: session.user, sessionId: token };
        }
      } catch (_) {}
    }
  }

  return { user: null, sessionId: null };
}

/**
 * Auth middleware wrapper — attach user to context.
 */
export async function withAuth<T extends Record<string, any>>(
  reqCtx: RequestContext,
  handler: (ctx: T & { user: AuthenticatedUser }) => Promise<any>
): Promise<any> {
  const { user } = await authenticate(reqCtx);
  if (!user) throw new Error('UNAUTHORIZED');

  return handler({ ...reqCtx as unknown as T, user });
}

/**
 * Require admin role.
 */
export async function requireAdmin(reqCtx: RequestContext): Promise<AuthenticatedUser> {
  const { user } = await authenticate(reqCtx);
  if (!user) throw new Error('UNAUTHORIZED');
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new Error('FORBIDDEN_ADMIN_REQUIRED');
  }
  return user;
}

/**
 * Force logout: clear session + invalidate DB records.
 */
export async function handleLogout(env: AuthEnv, sessionId: string | null): Promise<void> {
  if (sessionId) {
    await revokeSession(env, sessionId);
  }
}
