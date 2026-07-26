// ============================================
// Session Management
// Ported from shared/auth/session.ts with extensions
// ============================================

import type {
  AuthEnv,
  AuthenticatedUser,
  AuthenticatedSession,
  SessionRecord,
  UserRole,
} from './types';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// --- Helpers ---

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createOpaqueId(): Promise<string> {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function sha256Digest(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toBase64Url(new Uint8Array(digest));
}

function sessionKey(digest: string): string {
  return uth:session:;
}

function isExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}

// --- Create Session ---

export async function createSession(env: AuthEnv, user: AuthenticatedUser): Promise<{ sessionId: string; session: AuthenticatedSession }> {
  if (user.status !== 'active') throw new Error('CANNOT_CREATE_SESSION_INACTIVE_USER');

  const sessionId = await createOpaqueId();
  const digest = await sha256Digest(sessionId);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  const record: SessionRecord = {
    userId: user.id,
    role: user.role,
    sessionVersion: 1,
    createdAt: now,
    expiresAt,
  };

  await env.USER_CACHE.put(sessionKey(digest), JSON.stringify(record), { expirationTtl: SESSION_TTL_SECONDS });

  try {
    await env.DB.prepare(
      INSERT INTO auth_sessions (id, user_id, session_version, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)
    ).bind(digest, user.id, record.sessionVersion, now, expiresAt, now).run();
  } catch (_) {}

  try {
    await env.DB.prepare(
      INSERT INTO user_sessions (id, user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)
    ).bind(digest, user.id, sessionId, now, expiresAt).run();
  } catch (_) {}

  return {
    sessionId,
    session: { id: digest, user, createdAt: now, expiresAt },
  };
}

// --- Get Session ---

export async function getSession(env: AuthEnv, sessionId: string): Promise<AuthenticatedSession | null> {
  const digest = await sha256Digest(sessionId);
  const record = await env.USER_CACHE.get<SessionRecord>(sessionKey(digest), 'json');

  if (!record || isExpired(record.expiresAt)) {
    if (record) await env.USER_CACHE.delete(sessionKey(digest));
    return null;
  }

  try {
    const result = await env.DB.prepare(
      SELECT u.id, u.email, u.role, u.status, u.type, u.nickname
       FROM users AS u
       INNER JOIN auth_sessions AS s ON s.user_id = u.id
       WHERE s.id = ? AND s.session_version = ? AND s.revoked_at IS NULL AND s.expires_at > ?
       LIMIT 1
    ).bind(digest, record.sessionVersion, new Date().toISOString()).first<any>();

    if (!result || result.role !== record.role) {
      await revokeSession(env, sessionId);
      return null;
    }

    return {
      id: digest,
      user: {
        id: result.id,
        email: result.email ?? null,
        role: result.role as UserRole,
        status: result.status ?? 'active' as const,
        type: (result.type as 'guest' | 'wechat' | 'user') ?? 'guest',
        nickname: result.nickname ?? null,
      },
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  } catch (_) {
    return null;
  }
}

// --- Revoke Session ---

export async function revokeSession(env: AuthEnv, sessionId: string): Promise<void> {
  const digest = await sha256Digest(sessionId);
  await env.USER_CACHE.delete(sessionKey(digest));
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, ?), last_seen_at = ? WHERE id = ?)
      .bind(now, now, digest).run();
  } catch (_) {}

  try {
    await env.DB.prepare(UPDATE user_sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?)
      .bind(now, digest).run();
  } catch (_) {}
}

// --- Refresh Last Seen ---

export async function refreshLastSeen(env: AuthEnv, sessionId: string): Promise<void> {
  const digest = await sha256Digest(sessionId);
  try {
    await env.DB.prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), digest).run();
  } catch (_) {}
  try {
    await env.DB.prepare('UPDATE user_sessions SET updated_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), digest).run();
  } catch (_) {}
}

// --- Force Logout All Sessions ---

export async function logoutAllSessions(env: AuthEnv, userId: string): Promise<void> {
  const now = new Date().toISOString();

  try {
    await env.DB.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
      .bind(now, userId).run();
  } catch (_) {}

  try {
    await env.DB.prepare('UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
      .bind(now, userId).run();
  } catch (_) {}
}
