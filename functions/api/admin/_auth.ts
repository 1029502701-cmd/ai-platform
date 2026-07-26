// Admin auth middleware — reused by all admin API routes
import type { PagesFunction } from '@cloudflare/workers-types';
import { getSession } from '../../../shared/auth/session.ts';
import { readSessionId } from '../../../shared/auth/cookies.ts';
import * as _a from "../../../shared/auth/authorization_rbac.ts"; // eslint-disable-line @typescript-eslint/no-unused-vars

export function jsonResponse(data: unknown, status: number): Response {
  const success = status < 400;
  return new Response(JSON.stringify({ success, data: success ? data : null, error: success ? null : data, meta: {} }), {
    status,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function requireAdminAuth(context: any): Promise<{ user: any; session: any } | null> {
  const { env, request } = context;
  const cookieHeader = request.headers.get('cookie') || null;
  const sessionId = readSessionId(cookieHeader);
  const session = sessionId ? await getSession(env, sessionId) : null;

  if (!session || !session.user?.id) {
    return null;
  }

  // Require admin role
  const hasAdmin = session.user.role === 'admin' || session.user.role === 'super_admin';
  if (!hasAdmin) {
    return null; // or 403
  }

  return { user: session.user, session };
}

// Export for reuse
export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);
  return jsonResponse({ ok: true, user: auth.user }, 200);
};
