// ============================================
// WeChat Mini Program Login / Bind
// ============================================

import type { AuthEnv, AuthenticatedUser, User } from './types';

const WX_TOKEN_URL = 'https://api.weixin.qq.com/sns/jscode2session';
const WX_TOKEN_TTL = 60 * 5; // 5 minutes (but KV TTL is max 1500s)

/**
 * Exchange wx.login() code for openid + session_key.
 */
export async function getWechatSession(code: string, appId: string, appSecret: string): Promise<{
  openid: string;
  sessionKey: string;
  unionid?: string;
  errcode?: number;
}> {
  const url = ${WX_TOKEN_URL}?appid=&secret=&js_code=&grant_type=authorization_code;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode) {
    return { openid: '', sessionKey: '', errcode: data.errcode };
  }
  return {
    openid: data.openid,
    sessionKey: data.session_key,
    unionid: data.unionid,
  };
}

/**
 * Bind a WeChat account to an existing user (guest or registered).
 */
export async function bindWechatToUser(
  env: AuthEnv,
  userId: string,
  wechatSession: { openid: string; sessionKey: string; unionid?: string },
  nickname?: string,
  avatarUrl?: string,
): Promise<{ success: boolean; user: User | null }> {
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      UPDATE users SET
         openid = ?,
         unionid = ?,
         type = 'wechat',
         nickname = COALESCE(?, nickname),
         avatar = COALESCE(?, avatar),
         updated_at = ?
       WHERE id = ?
    ).bind(
      wechatSession.openid,
      wechatSession.unionid ?? null,
      nickname ?? null,
      avatarUrl ?? null,
      now,
      userId
    ).run();

    // Invalidate old sessions after binding (force re-auth)
    try {
      await env.DB.prepare(
        'UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL'
      ).bind(now, userId).run();
    } catch (_) {}

  } catch (e: any) {
    if (!e.message?.includes('UNIQUE')) throw e;
    // OPENID already taken by another user — conflict resolution needed
    // For now, return error
    return { success: false, user: null };
  }

  const user = await getUserByOpenid(env, wechatSession.openid);
  return { success: true, user };
}

/**
 * Or create a new user from WeChat login (if no matching openId).
 */
export async function createWechatUser(
  env: AuthEnv,
  wechatSession: { openid: string; unionid?: string },
  nickname?: string,
  avatarUrl?: string,
): Promise<User | null> {
  const now = new Date().toISOString();
  const userId = wx__;

  try {
    await env.DB.prepare(
      INSERT INTO users (id, email, role, type, status, nickname, avatar, openid, unionid, created_at, updated_at)
       VALUES (?, null, 'user', 'wechat', 'active', ?, ?, ?, ?, ?, ?)
    ).bind(userId, nickname ?? null, avatarUrl ?? null, wechatSession.openid, wechatSession.unionid ?? null, now, now).run();

    return {
      id: userId,
      email: null,
      passwordHash: null,
      role: 'user',
      type: 'wechat',
      status: 'active',
      nickname,
      avatarUrl,
      openid: wechatSession.openid,
      unionid: wechatSession.unionid ?? null,
      wechatProfile: null,
      createdAt: now,
      updatedAt: now,
    };
  } catch (e: any) {
    if (!e.message?.includes('UNIQUE')) throw e;
    // Already exists — return existing user
    return await getUserByOpenid(env, wechatSession.openid);
  }
}

/**
 * Look up user by WeChat openid.
 */
async function getUserByOpenid(env: AuthEnv, openid: string): Promise<User | null> {
  const row = await env.DB.prepare(
    'SELECT * FROM users WHERE openid = ? LIMIT 1'
  ).bind(openid).first<any>();

  if (!row || row.status === 'deleted') return null;

  return {
    id: row.id,
    email: row.email ?? null,
    passwordHash: row.password_hash ?? null,
    role: row.role ?? 'user',
    type: row.type ?? 'user',
    status: row.status ?? 'active',
    nickname: row.nickname ?? null,
    avatarUrl: row.avatar_url ?? null,
    openid: row.openid ?? null,
    unionid: row.unionid ?? null,
    wechatProfile: null,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}
