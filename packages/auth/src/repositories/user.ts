import type { D1Database } from '@cloudflare/workers-types';
import type { User, UserRole, UserStatus } from '../types';

export interface UserRepositoryConfig {
  db: D1Database;
}

export class UserRepository {
  private readonly db: D1Database;

  constructor(config: UserRepositoryConfig) {
    this.db = config.db;
  }

  async createGuest(): Promise<User> {
    const userId = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    const uuid = this.generateUuid();
    const now = new Date().toISOString();
    const nickname = 'Guest_' + userId.slice(-6);

    try {
      await this.db.prepare(
        'INSERT INTO users (id, uuid, type, role, status, nickname, created_at, updated_at) \
         VALUES (?, ?, \'guest\', \'user\', \'active\', ?, ?, ?)'
      ).bind(userId, uuid, nickname, now, now).run();

      return this.rowToUser({
        id: userId,
        uuid,
        email: null,
        passwordHash: null,
        role: 'user',
        type: 'guest',
        status: 'active',
        nickname,
        avatarUrl: null,
        openid: null,
        unionid: null,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE')) {
        return this.getById(userId);
      }
      throw e;
    }
  }

  async getById(userId: string): Promise<User | null> {
    const row = await this.db.prepare(
      'SELECT * FROM users WHERE id = ? AND status != \'deleted\' LIMIT 1'
    ).bind(userId).first<any>();
    if (!row) return null;
    return this.rowToUser(row);
  }

  async getByUUID(uuid: string): Promise<User | null> {
    const row = await this.db.prepare(
      'SELECT * FROM users WHERE uuid = ? AND status != \'deleted\' LIMIT 1'
    ).bind(uuid).first<any>();
    if (!row) return null;
    return this.rowToUser(row);
  }

  async updateProfile(
    userId: string,
    nickname: string | undefined = undefined,
    avatarUrl: string | undefined = undefined
  ): Promise<User | null> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(nickname);
    }
    if (avatarUrl !== undefined) {
      updates.push('avatar = ?');
      values.push(avatarUrl);
    }

    if (updates.length === 0) return this.getById(userId);

    values.push(now);
    values.push(userId);

    const query = 'UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?';
    await this.db.prepare(query).bind(...values).run();
    return this.getById(userId);
  }

  private generateUuid(): string {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private rowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email || null,
      passwordHash: row.password_hash || null,
      role: row.role,
      type: row.type || 'guest',
      status: row.status,
      nickname: row.nickname || null,
      avatarUrl: row.avatar || null,
      openid: row.openid || null,
      unionid: row.unionid || null,
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
    };
  }
}
