import type { D1Database } from '@cloudflare/workers-types';

export interface SessionRepositoryConfig {
  db: D1Database;
}

export class SessionRepository {
  private readonly db: D1Database;

  constructor(config: SessionRepositoryConfig) {
    this.db = config.db;
  }

  async createSession(
    userId: string,
    device?: string,
    ip?: string,
    userAgent?: string
  ): Promise<{ sessionId: string; expiresAt: string }> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await this.db.prepare(
        'INSERT INTO user_sessions (id, user_id, device, ip_address, user_agent, expires_at, created_at) \
         VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(sessionId, userId, device, ip, userAgent, expiresAt, new Date().toISOString()).run();
      return { sessionId, expiresAt };
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE')) {
        return this.createSession(userId, device, ip, userAgent);
      }
      throw e;
    }
  }

  async validateSession(sessionId: string): Promise<any | null> {
    const row = await this.db.prepare(
      'SELECT u.*, us.* FROM user_sessions us \
       JOIN users u ON us.user_id = u.id \
       WHERE us.id = ? AND us.expires_at > ? AND us.revoked_at IS NULL \
       LIMIT 1'
    ).bind(sessionId, new Date().toISOString()).first<any>();

    if (!row) return null;

    const user = {
      id: row.id,
      email: row.email || null,
      role: row.role,
      status: row.status,
      type: row.type || 'guest',
      nickname: row.nickname || null,
    };

    return {
      id: sessionId,
      user,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      'UPDATE user_sessions SET revoked_at = ? WHERE id = ?'
    ).bind(now, sessionId).run();
  }

  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }
}
