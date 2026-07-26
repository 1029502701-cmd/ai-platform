// ============================================
// Guest User Manager
// Core of the auth system: anonymous-first, then bind WeChat later
// ============================================

import type { AuthEnv, User } from './types';
import { v4 as uuidv4 } from 'uuid';

const GUEST_ID_COOKIE = '__Host-guest-id';

/**
 * Generate or return existing guest ID from cookie.
 * Returns a stable anonymous identity for users who haven't logged in.
 */
export function getOrCreateGuestId(cookieHeader: string | null): string {
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(${GUEST_ID_COOKIE}=([^;]+)));
    if (match?.[1]) {
      const id = decodeURIComponent(match[1]);
      if (/^guest_[a-f0-9]+$/.test(id)) return id;
    }
  }
  // New guest - generate UUID with guest_ prefix
  return guest_;
}

/**
 * Create a new guest user record in DB.
 * This is the entry point for all unauthenticated visitors.
 */
export async function createGuestUser(env: AuthEnv, guestId: string): Promise<User> {
  const now = new Date().toISOString();
  const user: Partial<User> = {
    id: guestId,
    email: null,
    passwordHash: null,
    role: 'user',
    type: 'guest',
    status: 'active',
    nickname: null,
    avatarUrl: null,
    openid: null,
    unionid: null,
    wechatProfile: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await env.DB.prepare(
      INSERT INTO users (id, type, status, role, created_at, updated_at)
       VALUES (?, 'guest', 'active', 'user', ?, ?)
    ).bind(guestId, now, now).run();
  } catch (e: any) {
    // Conflict is OK — user may already exist (guest bound to WeChat but record remains)
    if (!e.message?.includes('UNIQUE')) throw e;
  }

  return user as User;
}

/**
 * Read guest user from DB by ID.
 * Returns null if not found or deleted.
 */
export async function getGuestUser(env: AuthEnv, guestId: string): Promise<User | null> {
  const row = await env.DB.prepare(
    'SELECT * FROM users WHERE id = ? AND type = ? LIMIT 1'
  ).bind(guestId, 'guest').first<any>();

  if (!row || row.status === 'deleted') return null;

  return {
    id: row.id,
    email: row.email ?? null,
    passwordHash: row.password_hash ?? null,
    role: row.role ?? 'user',
    type: row.type ?? 'guest',
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

/**
 * Check if a guest should be allowed to proceed.
 * Used before AI generation / paid features.
 */
export function canGuestProceed(user: User): boolean {
  if (user.status !== 'active') return false;
  if (user.role === 'user') return true;
  return true; // guests and normal users can proceed
}

/**
 * Get guest-specific usage limits.
 * Guests get 3 free AI calls per day.
 */
export async function checkGuestLimit(db: any, guestId: string): Promise<{ ok: boolean; remaining: number }> {
  const row = await db.prepare(
    'SELECT used_count, daily_free_count, reset_time FROM user_usage_limits WHERE user_id = ?'
  ).bind(guestId).first<any>();

  if (!row) {
    // Initialize limit row for first-time guest
    const now = new Date().toISOString();
    await db.prepare(
      'INSERT INTO user_usage_limits (user_id, daily_free_count, used_count, reset_time) VALUES (?, 3, 0, ?)'
    ).bind(guestId, now).run();
    return { ok: true, remaining: 3 };
  }

  // Reset if past midnight
  const resetTime = new Date(row.reset_time);
  const now = new Date();
  if (resetTime <= now) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    await db.prepare(
      'UPDATE user_usage_limits SET used_count = 0, reset_time = ? WHERE user_id = ?'
    ).bind(tomorrow.toISOString(), guestId).run();
    return { ok: true, remaining: 3 };
  }

  const remaining = Math.max(0, (row.daily_free_count || 3) - (row.used_count || 0));
  return { ok: true, remaining };
}
