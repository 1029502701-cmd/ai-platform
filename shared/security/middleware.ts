import { AuthorizationService } from "./index.ts";
import type { PagesFunction } from "@cloudflare/workers-types";

/**
 * Auth middleware that returns user info + session, or null if unauthenticated.
 */
export async function requireAuth(context: any): Promise<{ user: any; session: any } | null> {
  const { env, request } = context;
  // Support Bearer token in header OR cookie
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  let sessionId: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    sessionId = authHeader.slice(7);
  } else {
    const cookieHeader = request.headers.get("cookie") || null;
    // Cookie-based session extraction
    const match = cookieHeader?.match(/session_id=([^\s;]+)/);
    sessionId = match ? decodeURIComponent(match[1]) : null;
  }

  if (!sessionId) return null;

  try {
    const { getSession } = await import("../../shared/auth/session.ts");
    const session = await getSession(env, sessionId);
    if (session && session.user?.id) {
      return { user: session.user, session };
    }
  } catch {}
  return null;
}

/**
 * Require a specific permission. Returns null and sends 403 if denied.
 */
export async function requirePermission(context: any, permission: string): Promise<{ user: any; session: any } | null> {
  const auth = await requireAuth(context);
  if (!auth) return null;

  try {
    const hasPerm = await AuthorizationService.hasPermission(context.env, String(auth.user.id), permission as any);
    if (!hasPerm) return null;
  } catch {
    // On error, fail-closed
    return null;
  }
  return auth;
}

/**
 * Admin-only access (requires at least 'admin' role).
 */
export async function requireAdmin(context: any): Promise<{ user: any; session: any } | null> {
  const auth = await requireAuth(context);
  if (!auth) return null;

  try {
    // Check via permissions instead of hard-coded roles
    const hasManage = await AuthorizationService.hasPermission(context.env, String(auth.user.id), "system.manage" as any);
    if (hasManage) return auth;
    // Also check role as fallback
    if (auth.user.role === "admin" || auth.user.role === "super_admin") return auth;
  } catch {}
  return null;
}

/**
 * Create a JSON response with consistent format.
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  const success = status < 400;
  return new Response(JSON.stringify({
    success,
    data: success ? data : null,
    error: success ? null : data,
    meta: {},
  }), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
