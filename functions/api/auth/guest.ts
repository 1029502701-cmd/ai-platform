import type { PagesFunction } from "@cloudflare/workers-types";
import { createSession } from '../../../shared/auth/session.ts';
import type { AuthEnv } from '../../../shared/auth/types.ts';

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

export const onRequestPost = async (context: RequestContext) => {
  const { env } = context;
  const now = new Date().toISOString();
  // create a new guest user
  const userId = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const nickname = `Guest-${userId.slice(-6)}`;
  try {
    await env.DB.prepare(
      `INSERT INTO users (id, nickname, type, role, status, created_at, updated_at) VALUES (?, ?, 'guest', 'user', 'active', ?, ?)`
    ).bind(userId, nickname, now, now).run();

    // create profile row as well
    try {
      await env.DB.prepare(
        `INSERT INTO profiles (user_id, display_name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(userId, nickname, null, now, now).run();
    } catch (e) {
      // ignore
    }

    const { sessionId, session } = await createSession(env, { id: userId, email: "", role: "user", status: "active" });

    return jsonResponse({ success: true, data: { userId, guestToken: sessionId, expiresAt: session.expiresAt } });

    // Seed plan and quota for new guest user
    try {
        const db = env.DB;
        await db.prepare("INSERT OR IGNORE INTO user_plan_assignments (user_id, plan_name) VALUES (?, 'free')").bind(userId).run();
        await db.prepare(
            "INSERT OR IGNORE INTO user_quotas (user_id, quota_type, total_limit, used_count, reset_interval) VALUES (?, 'daily_requests', 5, 0, 'daily')"
        ).bind(userId).run();
    } catch {
        // Seeding failure must not break guest creation
    }
  } catch (e: any) {
    return jsonResponse({ success: false, error: e.message || String(e) }, 500);
  }
};
