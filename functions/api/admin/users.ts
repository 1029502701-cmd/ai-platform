import { getSession } from '../../../shared/auth/session.ts';
import { readSessionId } from '../../../shared/auth/cookies.ts';
import * as authz from '../../../shared/auth/authorization_rbac.ts';
import type { PagesFunction } from "@cloudflare/workers-types";
import type { AuthEnv } from '../../../shared/auth/types.ts';

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

function jsonResponse(data: unknown, status: number): Response {
  const success = status < 400;
  return new Response(JSON.stringify({ success, data: success ? data : null, error: success ? null : data, meta: {} }), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  });
}

export const onRequestGet = async (context: RequestContext) => {
  const { env, request } = context;
  const cookieHeader = request.headers.get('cookie') || null;
  const sessionId = readSessionId(cookieHeader);
  const session = sessionId ? await getSession(env, sessionId) : null;
  if (!session || !session.user?.id) {
    return jsonResponse({ code: "UNAUTHENTICATED", message: "Authentication required" }, 401);
  }
  const userId = session.user.id;
  const ok = await authz.hasPermission(env, userId, 'admin.users.view');
  if (!ok) return jsonResponse({ code: "FORBIDDEN", message: "Insufficient permissions" }, 403);

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  if (action === 'stats') {
    const guestRes: any = await env.DB.prepare("SELECT COUNT(1) as cnt FROM users WHERE type = 'guest' AND status = 'active'").first();
    const wechatRes: any = await env.DB.prepare("SELECT COUNT(1) as cnt FROM users WHERE type = 'wechat' AND status = 'active'").first();
    const guestCount = guestRes && guestRes.cnt ? Number(guestRes.cnt) : 0;
    const wechatCount = wechatRes && wechatRes.cnt ? Number(wechatRes.cnt) : 0;
    const total = guestCount + wechatCount;
    const conversionRate = total === 0 ? 0 : Number((wechatCount / total).toFixed(4));
    return jsonResponse({ guest_count: guestCount, wechat_count: wechatCount, conversion_rate: conversionRate }, 200);
  }

  // list users, optional filter by type
  const type = url.searchParams.get('type');
  let rows;
  if (type) {
    rows = await env.DB.prepare('SELECT id, nickname, type, status, created_at FROM users WHERE type = ? ORDER BY created_at DESC LIMIT 100').bind(type).all();
  } else {
    rows = await env.DB.prepare('SELECT id, nickname, type, status, created_at FROM users ORDER BY created_at DESC LIMIT 100').all();
  }
  const users = (rows && rows.results) ? rows.results : [];
  return jsonResponse({ users }, 200);
};
