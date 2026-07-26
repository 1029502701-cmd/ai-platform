import type { PagesFunction } from "@cloudflare/workers-types";
import { getLogger, extractRequestMeta, logToDB } from "../shared/logger";
import { checkMultiRateLimit } from "../shared/security/index.ts";

type Env = Record<string, unknown>;
type RequestContext = Parameters<PagesFunction<Env>>[0];

const middlewareLog = getLogger("_middleware");

// Security headers applied to every response
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// Rate limit tiers by path pattern
function getRateLimitTier(pathname: string): { tier: string; key: string } {
  if (pathname.startsWith('/api/admin')) {
    return { tier: 'admin', key: 'ip:' + pathname };
  }
  if (pathname.startsWith('/api/auth')) {
    return { tier: 'free', key: 'ip:' + pathname };
  }
  if (pathname.startsWith('/api/')) {
    return { tier: 'guest', key: 'ip:' + pathname };
  }
  return { tier: 'guest', key: 'ip:/default' };
}

export const onRequest = async (context: RequestContext) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const pathname = new URL(context.request.url).pathname;

  const reqMeta: Record<string, unknown> = extractRequestMeta(context as any);

  // Request start log
  middlewareLog.info("REQUEST_START", {
    requestId,
    method: context.request.method,
    path: pathname,
    ...reqMeta,
  });

  // Rate Limiting (skip health/static paths)
  if (!pathname.startsWith('/api/health')) {
    try {
      const { tier, key } = getRateLimitTier(pathname);
      const rl = checkMultiRateLimit(key, tier as any);

      if (!rl.allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "RATE_LIMITED", message: "Too many requests" },
            meta: { requestId, retryAfterMs: rl.retryAfterMs },
          }),
          { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)), "Content-Type": "application/json" } },
        );
      }
    } catch (e) {
      middlewareLog.warn("Rate limit check failed (continuing)", { error: String(e) });
    }
  }

  try {
    const response = await context.next();
    const duration = Date.now() - startTime;

    // Add security headers on outgoing response
    if (response.headers) {
      for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
        if (!response.headers.has(header)) {
          response.headers.set(header, value);
        }
      }
      response.headers.set("X-Request-Id", requestId);
      if (!response.headers.has("Cache-Control")) {
        response.headers.set("Cache-Control", "public, max-age=60");
      }
      response.headers.set("X-Response-Time", duration + "ms");
    }

    // Response complete log
    const statusCode = response.status;
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    middlewareLog.log(level as any, "REQUEST_COMPLETE", {
      requestId,
      status: statusCode,
      durationMs: duration,
    });

    // Log to DB for admin monitoring (async, fire-and-forget)
    if (context.env?.DB) {
      try {
        const db = context.env.DB as any;
        await logToDB(db, {
          requestId,
          level: statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info",
          module: "http",
          message: context.request.method + " " + pathname + " " + statusCode,
          metadata: { durationMs: duration, ...reqMeta },
        }).catch(() => {});
      } catch { /* DB logging must never break the request */ }
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    middlewareLog.error("GLOBAL_ERROR", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown",
      durationMs: duration,
      stack: error instanceof Error ? error.stack || "" : undefined,
    });

    if (context.env?.DB) {
      try {
        const db = context.env.DB as any;
        await logToDB(db, {
          requestId,
          level: "error",
          module: "global_error",
          message: error instanceof Error ? error.message : "Unknown error",
          metadata: { durationMs: duration },
        }).catch(() => {});
      } catch { /* ignore */ }
    }

    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: { code: "INTERNAL_ERROR", message: "Server internal error" },
        meta: { requestId, timestamp: new Date().toISOString() },
      }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }
};