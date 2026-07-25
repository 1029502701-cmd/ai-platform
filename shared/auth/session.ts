import type {
  AuthenticatedSession,
  AuthenticatedUser,
  AuthEnv,
  SessionRecord,
} from "./types";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_KEY_PREFIX = "auth:session:";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createOpaqueSessionId(): Promise<string> {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function digestSessionId(sessionId: string): Promise<string> {
  const encoded = new TextEncoder().encode(sessionId);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toBase64Url(new Uint8Array(digest));
}

function sessionKey(digest: string): string {
  return `${SESSION_KEY_PREFIX}${digest}`;
}

function isExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}

export async function createSession(
  env: AuthEnv,
  user: AuthenticatedUser,
): Promise<{ sessionId: string; session: AuthenticatedSession }> {
  if (user.status !== "active") {
    throw new Error("Cannot create a session for an inactive user");
  }

  const sessionId = await createOpaqueSessionId();
  const digest = await digestSessionId(sessionId);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  const record: SessionRecord = {
    userId: user.id,
    role: user.role,
    sessionVersion: 1,
    createdAt: now,
    expiresAt,
  };

  await env.USER_CACHE.put(sessionKey(digest), JSON.stringify(record), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  try {
    await env.DB.prepare(
      `INSERT INTO auth_sessions
        (id, user_id, session_version, created_at, expires_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(digest, user.id, record.sessionVersion, now, expiresAt, now)
      .run();

      // Also maintain user_sessions table for compatibility with new auth flows
      try {
        await env.DB.prepare(
          `INSERT INTO user_sessions (id, user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
        )
          .bind(digest, user.id, sessionId, now, expiresAt)
          .run();
      } catch (e) {
        // non-fatal: ignore if user_sessions not present in older DBs
      }
    } catch (error) {
      await env.USER_CACHE.delete(sessionKey(digest));
      throw error;
    }

    return {
      sessionId,
      session: { id: digest, user, createdAt: now, expiresAt },
    };
}

export async function getSession(
  env: AuthEnv,
  sessionId: string,
): Promise<AuthenticatedSession | null> {
  const digest = await digestSessionId(sessionId);
  const record = await env.USER_CACHE.get<SessionRecord>(sessionKey(digest), "json");
  if (!record || isExpired(record.expiresAt)) {
    if (record) {
      await env.USER_CACHE.delete(sessionKey(digest));
    }
    return null;
  }

  const result = await env.DB.prepare(
    `SELECT u.id, u.email, u.role, u.status
     FROM users AS u
     INNER JOIN auth_sessions AS s ON s.user_id = u.id
     WHERE s.id = ?
       AND s.session_version = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > ?
       AND u.status = 'active'
     LIMIT 1`,
  )
    .bind(digest, record.sessionVersion, new Date().toISOString())
    .first<AuthenticatedUser>();

  if (!result || result.role !== record.role) {
    await revokeSession(env, sessionId);
    return null;
  }

  return {
    id: digest,
    user: result,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  };
}

export async function revokeSession(env: AuthEnv, sessionId: string): Promise<void> {
  const digest = await digestSessionId(sessionId);
  await env.USER_CACHE.delete(sessionKey(digest));
  await env.DB.prepare(
    `UPDATE auth_sessions
     SET revoked_at = COALESCE(revoked_at, ?), last_seen_at = ?
     WHERE id = ?`,
  )
    .bind(new Date().toISOString(), new Date().toISOString(), digest)
    .run();

  try {
    await env.DB.prepare(
      `UPDATE user_sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?`,
    )
      .bind(new Date().toISOString(), digest)
      .run();
  } catch (e) {
    // ignore if table not present
  }
}
