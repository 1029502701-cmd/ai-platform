import type { PagesFunction } from "@cloudflare/workers-types";
import { getSession, revokeSession, createSession } from '../../../shared/auth/session.ts';
import type { AuthEnv } from '../../../shared/auth/types.ts';

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

export const onRequestGet = async (context: RequestContext) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) return jsonResponse({ success: false, error: 'MISSING_CODE' }, 400);
  if (!state) return jsonResponse({ success: false, error: 'MISSING_STATE' }, 400);

  // Mock exchange: in real world exchange `code` with WeChat to get openid/unionid/nickname/avatar
  const openid = 'wx_' + Math.random().toString(36).slice(2,10);
  const unionid = 'union_' + Math.random().toString(36).slice(2,10);
  const nickname = 'WeChatUser_' + Math.random().toString(36).slice(2,6);
  const avatar = null;

  // Find existing guest session using state token
  const session = await getSession(env, state);
  if (!session) return jsonResponse({ success: false, error: 'INVALID_SESSION' }, 401);

  const guestUserId = session.user.id;

  // Look for existing wechat user
  const existing: any = await env.DB.prepare('SELECT id FROM users WHERE openid = ? OR unionid = ? LIMIT 1').bind(openid, unionid).first();
  const now = new Date().toISOString();
  let targetUserId = guestUserId;

  if (existing && existing.id && existing.id !== guestUserId) {
    // merge guest into existing wechat account
    targetUserId = existing.id;
    try {
      await env.DB.prepare('UPDATE beauty_profiles SET user_id = ? WHERE user_id = ?').bind(targetUserId, guestUserId).run();
      await env.DB.prepare('UPDATE beauty_reports SET user_id = ? WHERE user_id = ?').bind(targetUserId, guestUserId).run();
      await env.DB.prepare('UPDATE ai_usage SET user_id = ? WHERE user_id = ?').bind(targetUserId, guestUserId).run();
      await env.DB.prepare('UPDATE profiles SET user_id = ? WHERE user_id = ?').bind(targetUserId, guestUserId).run();
      // mark guest account as merged
      await env.DB.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').bind('merged', now, guestUserId).run();
    } catch (e) {
      // continue even if partial
    }
  } else {
    // bind openid/unionid to guest user record and convert type to 'wechat'
    await env.DB.prepare('UPDATE users SET openid = ?, unionid = ?, type = ?, nickname = ?, avatar = ?, updated_at = ? WHERE id = ?')
      .bind(openid, unionid, 'wechat', nickname, avatar, now, guestUserId)
      .run();
    targetUserId = guestUserId;
  }

  // Revoke old session and create a new session for the target (wechat) user
  try {
    await revokeSession(env, state);
  } catch (e) {}

  const { sessionId, session: newSession } = await createSession(env, { id: targetUserId, email: "", role: "user", status: "active" });

  return jsonResponse({ success: true, data: { userId: targetUserId, token: sessionId, expiresAt: newSession.expiresAt } });
};
