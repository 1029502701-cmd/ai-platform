import { readSessionId } from "../auth/cookies";
import { getSession, createSession, revokeSession } from "../auth/session";
import type { AuthEnv } from "../auth/types";

export async function requireUser(env: AuthEnv, request: Request) {
  const cookie = request.headers.get("cookie") || null;
  const sessionId = readSessionId(cookie);
  if (!sessionId) return null;
  return getSession(env, sessionId);
}

export { getSession, createSession, revokeSession };
