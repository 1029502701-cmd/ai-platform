// Admin auth middleware — reused by all admin API routes
import type { PagesFunction } from '@cloudflare/workers-types';
import { getSession } from '../shared/auth/session.ts';
import { readSessionId } from '../shared/auth/cookies.ts';
import * as _a from '../shared/auth/authorization_rbac.ts'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { AuthorizationService } from '../shared/security/index.ts';
import { redactFields } from '../shared/security/types.ts';

export function jsonResponse(data: unknown, status: number): Response {
  const success = status < 400;
  return new Response(JSON.stringify({ success, data: success ? data : null, error: success ? null : data, meta: {} }), {
    status,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function requireUserAuth(context: any): Promise<{ user: any; session: any } | null> {
  const { env, request } = context;
  const cookieHeader = request.headers.get("cookie") || null;
  const sessionId = readSessionId(cookieHeader);
  if (!sessionId) return null;
  const session = await getSession(env, sessionId);
  if (!session || !session.user?.id) return null;
  // User must be active
  if (session.user.status === "banned" || session.user.status === "deleted") return null;
  return { user: session.user, session };
}

export async function requireAdminAuth(context: any): Promise<{ user: any; session: any } | null> {
  const { env, request } = context;
  const cookieHeader = request.headers.get('cookie') || null;
  const sessionId = readSessionId(cookieHeader);
  const session = sessionId ? await getSession(env, sessionId) : null;

  if (!session || !session.user?.id) {
    return null;
  }

  // Permission-based check (fail-safe fallback to role check)
  try {
    const hasManage = await AuthorizationService.hasPermission(env, String(session.user.id), "system.manage");
    if (hasManage) return { user: session.user, session };
  } catch {}

  // Fallback: role check
  const hasAdmin = session.user.role === 'admin' || session.user.role === 'super_admin';
  if (!hasAdmin) {
    return null;
  }
  return { user: session.user, session };
}

export async function requirePermission(context: any, permission: string): Promise<{ user: any; session: any } | null> {
  const auth = await requireUserAuth(context);
  if (!auth) return null;
  try {
    const hasPerm = await AuthorizationService.hasPermission(context.env, String(auth.user.id), permission as any);
    if (!hasPerm) return null;
  } catch { return null; }
  return auth;
}

// Export for reuse
export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);
  return jsonResponse({ ok: true, user: auth.user }, 200);
};