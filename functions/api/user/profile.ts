import type { PagesFunction } from "@cloudflare/workers-types";
import { readSessionId } from "../../../shared/auth/cookies";
import { getSession } from "../../../shared/auth/session";
import type { AuthEnv } from "../../../shared/auth/types";
import { getUserProfile, updateUserProfile, validateProfileUpdate } from "../../../shared/user/profile";

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

function jsonResponse(data: unknown, status: number): Response {
  const success = status < 400;
  return new Response(
    JSON.stringify({ success, data: success ? data : null, error: success ? null : data, meta: {} }),
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}

async function requireUser(context: RequestContext) {
  const sessionId = readSessionId(context.request.headers.get("Cookie"));
  if (!sessionId) {
    return null;
  }
  return getSession(context.env, sessionId);
}

export const onRequestGet = async (context: RequestContext) => {
  const session = await requireUser(context);
  if (!session) {
    return jsonResponse({ code: "UNAUTHENTICATED", message: "Authentication required" }, 401);
  }

  const profile = await getUserProfile(context.env.DB, session.user.id);
  return profile
    ? jsonResponse(profile, 200)
    : jsonResponse({ code: "USER_NOT_FOUND", message: "User not found" }, 404);
};

export const onRequestPatch = async (context: RequestContext) => {
  const session = await requireUser(context);
  if (!session) {
    return jsonResponse({ code: "UNAUTHENTICATED", message: "Authentication required" }, 401);
  }

  let body: unknown;
  try {
    const text = await context.request.text();
      body = text ? JSON.parse(text) : {};
  } catch {
    return jsonResponse({ code: "INVALID_JSON", message: "Request body must be valid JSON" }, 400);
  }

  try {
    const input = validateProfileUpdate(body);
    const profile = await updateUserProfile(context.env.DB, session.user.id, input);
    return profile
      ? jsonResponse(profile, 200)
      : jsonResponse({ code: "USER_NOT_FOUND", message: "User not found" }, 404);
  } catch (error) {
    return jsonResponse(
      { code: "INVALID_PROFILE", message: error instanceof Error ? error.message : "Invalid profile" },
      400,
    );
  }
};
