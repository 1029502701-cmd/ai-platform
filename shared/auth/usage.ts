export async function nextMidnightISOString() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.toISOString();
}

export async function ensureUsageRow(db: any, userId: string) {
  const row = await db.prepare('SELECT user_id, daily_free_count, used_count, reset_time FROM user_usage_limits WHERE user_id = ?').bind(userId).first();
  if (row && row.user_id) return row;
  const reset = await nextMidnightISOString();
  await db.prepare('INSERT INTO user_usage_limits (user_id, daily_free_count, used_count, reset_time) VALUES (?, ?, ?, ?)')
    .bind(userId, 3, 0, reset)
    .run();
  return { user_id: userId, daily_free_count: 3, used_count: 0, reset_time: reset };
}

export async function checkAndConsumeLimit(db: any, userId: string) {
  // determine user type
  const u = await db.prepare('SELECT id, type FROM users WHERE id = ? LIMIT 1').bind(userId).first();
  const userType = u && u.type ? u.type : null;
  if (userType !== 'guest') return { ok: true };

  const row = await ensureUsageRow(db, userId);
  const now = new Date();
  if (row.reset_time && Date.parse(row.reset_time) <= now.getTime()) {
    // reset counts
    const newReset = await nextMidnightISOString();
    await db.prepare('UPDATE user_usage_limits SET used_count = 0, reset_time = ? WHERE user_id = ?').bind(newReset, userId).run();
    row.used_count = 0;
    row.reset_time = newReset;
  }

  if (row.used_count >= row.daily_free_count) {
    return { ok: false, error: 'DAILY_LIMIT_EXCEEDED' };
  }

  await db.prepare('UPDATE user_usage_limits SET used_count = used_count + 1 WHERE user_id = ?').bind(userId).run();
  return { ok: true };
}
