import type { PagesFunction } from "@cloudflare/workers-types";
import type { AuthEnv } from "../../shared/auth/types";
import { readSessionId } from "../../shared/auth/cookies";
import { getSession } from "../../shared/auth/session";
import * as authz from "../../shared/auth/authorization_rbac";
import { getUserSettingsFromDb, upsertUserSettingsToDb } from "../../shared/user/settings";
import { getCachedSettings, putCachedSettings } from "../../shared/user/settings_cache";

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

function jsonResponse(data: unknown, status: number): Response {
  const success = status < 400;
  return new Response(JSON.stringify({ success, data: success ? data : null, error: success ? null : data, meta: {} }), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

// Admin GET: /api/admin-user-settings?userId=...
export const onRequestGet = async (context: RequestContext) => {
  const { env, request } = context;
  const cookie = request.headers.get("cookie") || null;
  const sessionId = readSessionId(cookie);
  const session = sessionId ? await getSession(env, sessionId) : null;
  if (!session || !session.user?.id) return jsonResponse({ code: "UNAUTHENTICATED", message: "Authentication required" }, 401);
  const actor = session.user.id;
  const ok = await authz.hasPermission(env, actor, "admin.users.manage");
  if (!ok) return jsonResponse({ code: "FORBIDDEN", message: "Insufficient permissions" }, 403);

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return jsonResponse({ code: "MISSING_PARAMS", message: "userId required" }, 400);

  const cached = await getCachedSettings(env.USER_CACHE, userId);
  if (cached) return jsonResponse(cached, 200);
  const dbSettings = await getUserSettingsFromDb(env.DB, userId);
  const out = dbSettings || null;
  if (out) await putCachedSettings(env.USER_CACHE, userId, out);
  return jsonResponse(out, 200);
};

// Admin POST to override user settings
export const onRequestPost = async (context: RequestContext) => {
  const { env, request } = context;
  const cookie = request.headers.get("cookie") || null;
  const sessionId = readSessionId(cookie);
  const session = sessionId ? await getSession(env, sessionId) : null;
  if (!session || !session.user?.id) return jsonResponse({ code: "UNAUTHENTICATED", message: "Authentication required" }, 401);
  const actor = session.user.id;
  const ok = await authz.hasPermission(env, actor, "admin.users.manage");
  if (!ok) return jsonResponse({ code: "FORBIDDEN", message: "Insufficient permissions" }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ code: "INVALID_JSON", message: "Request body must be JSON" }, 400);
  }

  const { userId, settings } = body as any || {};
  if (!userId || !settings) return jsonResponse({ code: "MISSING_PARAMS", message: "userId and settings required" }, 400);

  try {
    await upsertUserSettingsToDb(env.DB, userId, settings);
    await putCachedSettings(env.USER_CACHE, userId, settings);
    await env.DB.prepare('INSERT OR IGNORE INTO audit_logs (id, actor_id, action, target, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').bind(cryptoRandomId(), actor, `admin_override_settings`, userId).run();
    return jsonResponse({ message: "ok" }, 200);
  } catch (e: any) {
    return jsonResponse({ code: "DB_ERROR", message: e.message || "Database error" }, 500);
  }
};

function cryptoRandomId() {
  return 'audit_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
