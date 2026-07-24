import type { PagesFunction } from "@cloudflare/workers-types";
import { clearSessionCookie, readSessionId } from "../../../shared/auth/cookies";
import { getSession, revokeSession } from "../../../shared/auth/session";
import type { AuthEnv } from "../../../shared/auth/types";

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

function isSecureRequest(requestUrl: string): boolean {
  return new URL(requestUrl).protocol === "https:";
}

function responseHeaders(requestUrl: string): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  headers.set("Vary", "Cookie");
  if (isSecureRequest(requestUrl)) {
    headers.set("Strict-Transport-Security", "max-age=31536000");
  }
  return headers;
}

export const onRequestGet = async (context: RequestContext) => {
  const headers = responseHeaders(context.request.url);
  const sessionId = readSessionId(context.request.headers.get("Cookie"));
  if (!sessionId) {
    return new Response(
      JSON.stringify({
        success: true,
        data: { authenticated: false, user: null },
        error: null,
        meta: {},
      }),
      { status: 200, headers },
    );
  }

  const session = await getSession(context.env, sessionId);
  return new Response(
    JSON.stringify({
      success: true,
      data: session
        ? {
            authenticated: true,
            user: { id: session.user.id, email: session.user.email, role: session.user.role },
          }
        : { authenticated: false, user: null },
      error: null,
      meta: {},
    }),
    { status: 200, headers },
  );
};

export const onRequestDelete = async (context: RequestContext) => {
  const sessionId = readSessionId(context.request.headers.get("Cookie"));
  if (sessionId) {
    await revokeSession(context.env, sessionId);
  }

  const headers = responseHeaders(context.request.url);
  headers.set("Set-Cookie", clearSessionCookie(isSecureRequest(context.request.url)));
  return new Response(
    JSON.stringify({ success: true, data: { authenticated: false }, error: null, meta: {} }),
    { status: 200, headers },
  );
};
