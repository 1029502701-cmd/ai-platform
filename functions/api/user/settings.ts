import type { PagesFunction } from "@cloudflare/workers-types";
import type { AuthEnv } from "../../../shared/auth/types";
import { readSessionId } from "../../../shared/auth/cookies";
import { getSession } from "../../../shared/auth/session";
import { DEFAULT_SETTINGS, getUserSettingsFromDb, mergeSettings, upsertUserSettingsToDb, validatePartialSettings } from "../../../shared/user/settings";
import { getCachedSettings, putCachedSettings } from "../../../shared/user/settings_cache";

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

function jsonResponse(data: unknown, status: number): Response {
  const success = status < 400;
  return new Response(JSON.stringify({ success, data: success ? data : null, error: success ? null : data, meta: {} }), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

export const onRequestGet = async (context: RequestContext) => {
  const { env, request } = context;
  const cookie = request.headers.get("cookie") || null;
  const sessionId = readSessionId(cookie);
  const session = sessionId ? await getSession(env, sessionId) : null;
  if (!session || !session.user?.id) return jsonResponse({ code: "UNAUTHENTICATED", message: "Authentication required" }, 401);
  const userId = session.user.id;

  // Try KV cache first
  const cached = await getCachedSettings(env.USER_CACHE, userId);
  if (cached) return jsonResponse(cached, 200);

  // Fallback to DB
  const dbSettings = await getUserSettingsFromDb(env.DB, userId);
  const out = dbSettings || DEFAULT_SETTINGS;

  // Put to cache for future
  await putCachedSettings(env.USER_CACHE, userId, out);
  return jsonResponse(out, 200);
};

export const onRequestPatch = async (context: RequestContext) => {
  const { env, request } = context;
  const cookie = request.headers.get("cookie") || null;
  const sessionId = readSessionId(cookie);
  const session = sessionId ? await getSession(env, sessionId) : null;
  if (!session || !session.user?.id) return jsonResponse({ code: "UNAUTHENTICATED", message: "Authentication required" }, 401);
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ code: "INVALID_JSON", message: "Request body must be valid JSON" }, 400);
  }

  let patch;
  try {
    patch = validatePartialSettings(body);
  } catch (e: any) {
    return jsonResponse({ code: "INVALID_SETTINGS", message: e.message || "Invalid settings" }, 400);
  }

  // Read current settings (DB preferred for write path)
  const dbSettings = await getUserSettingsFromDb(env.DB, userId) || DEFAULT_SETTINGS;
  const merged = mergeSettings(dbSettings, patch as any);

  // Persist to DB
  await upsertUserSettingsToDb(env.DB, userId, merged as any);

  // Update cache (write-through)
  await putCachedSettings(env.USER_CACHE, userId, merged as any);

  return jsonResponse(merged, 200);
};

export const onRequestPut = async (context: RequestContext) => {
  const { env, request } = context;
  const cookie = request.headers.get("cookie") || null;
  const sessionId = readSessionId(cookie);
  const session = sessionId ? await getSession(env, sessionId) : null;
  if (!session || !session.user?.id) return jsonResponse({ code: "UNAUTHENTICATED", message: "Authentication required" }, 401);
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ code: "INVALID_JSON", message: "Request body must be valid JSON" }, 400);
  }

  // For PUT we expect a full settings object; validate by reusing partial validation and merging with defaults
  try {
    // Validate keys
    const patch = validatePartialSettings(body);
    // Apply onto defaults and ensure final passes
    const merged = mergeSettings(DEFAULT_SETTINGS, patch as any);
    await upsertUserSettingsToDb(env.DB, userId, merged as any);
    await putCachedSettings(env.USER_CACHE, userId, merged as any);
    return jsonResponse(merged, 200);
  } catch (e: any) {
    return jsonResponse({ code: "INVALID_SETTINGS", message: e.message || "Invalid settings" }, 400);
  }
};
