// ============================================
// Usage & Quota Management
// Per-user daily limits, guest quotas, etc.
// ============================================

import type { AuthEnv, UsageCheckResult } from './types';

/** Return ISO string for next midnight */
async function nextMidnight(): Promise<string> {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

/** Get or create a usage limit row for a user */
async function ensureUsageRow(db: any, userId: string): Promise<any> {
  const row = await db.prepare(
    'SELECT user_id, daily_free_count, used_count, reset_time FROM user_usage_limits WHERE user_id = ?'
  ).bind(userId).first<any>();

  if (row?.user_id) return row;

  const reset = await nextMidnight();
  await db.prepare(
    'INSERT INTO user_usage_limits (user_id, daily_free_count, used_count, reset_time) VALUES (?, ?, ?, ?)'
  ).bind(userId, 3, 0, reset).run();

  return { user_id: userId, daily_free_count: 3, used_count: 0, reset_time: reset };
}

/** Check and consume one quota unit. Returns remaining count. */
export async function checkAndConsumeLimit(db: any, userId: string): Promise<UsageCheckResult> {
  const u = await db.prepare('SELECT id, type FROM users WHERE id = ? LIMIT 1').bind(userId).first<any>();
  if (!u) return { ok: false, error: 'USER_NOT_FOUND', limitExceeded: true };

  // Only enforce free limits on guests
  if (u.type !== 'guest') return { ok: true, remaining: -1 }; // unlimited

  const row = await ensureUsageRow(db, userId);
  const now = new Date();

  // Reset if past midnight
  if (row.reset_time && new Date(row.reset_time) <= now) {
    const newReset = await nextMidnight();
    await db.prepare('UPDATE user_usage_limits SET used_count = 0, reset_time = ? WHERE user_id = ?')
      .bind(newReset, userId).run();
    row.used_count = 0;
    row.reset_time = newReset;
  }

  if (row.used_count >= (row.daily_free_count || 3)) {
    return { ok: false, error: 'DAILY_LIMIT_EXCEEDED', limitExceeded: true };
  }

  await db.prepare('UPDATE user_usage_limits SET used_count = used_count + 1 WHERE user_id = ?').bind(userId).run();

  return {
    ok: true,
    remaining: (row.daily_free_count || 3) - (row.used_count + 1),
  };
}

/** Get current remaining quota without consuming */
export async function getRemainingQuota(db: any, userId: string): Promise<number> {
  const row = await ensureUsageRow(db, userId);
  if (new Date(row.reset_time) <= new Date()) return 3; // will reset next call

  return Math.max(0, (row.daily_free_count || 3) - (row.used_count || 0));
}
