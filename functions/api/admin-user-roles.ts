import { getSession } from '../../shared/auth/session.ts';
import { readSessionId } from '../../shared/auth/cookies.ts';
import * as authz from '../../shared/auth/authorization_rbac.ts';
import type { PagesFunction } from "@cloudflare/workers-types";
import type { AuthEnv } from '../../shared/auth/types.ts';

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

interface UpdateUserRoleBody {
  action?: "assign" | "revoke";
  userId?: string;
  roleId?: string;
}

function jsonResponse(data: unknown, status: number): Response {
  const success = status < 400;
  return new Response(
    JSON.stringify({ success, data: success ? data : null, error: success ? null : data, meta: {} }),
    { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } },
  );
}

// POST /api/admin-user-roles -> { action: 'assign'|'revoke', userId, roleId }
export const onRequestPost = async (context: RequestContext) => {
  const { env, request } = context;
  const cookieHeader = request.headers.get('cookie') || null;
  const sessionId = readSessionId(cookieHeader);
  const session = sessionId ? await getSession(env, sessionId) : null;
  if (!session || !session.user?.id) {
    return jsonResponse({ code: "UNAUTHENTICATED", message: "Authentication required" }, 401);
  }
  const actorId = session.user.id;
  const ok = await authz.hasPermission(env, actorId, 'admin.users.manage');
  if (!ok) {
    return jsonResponse({ code: "FORBIDDEN", message: "Insufficient permissions" }, 403);
  }

  let body: UpdateUserRoleBody;
  try {
    const text = await request.text();
    body = text ? (JSON.parse(text) as UpdateUserRoleBody) : {};
  } catch {
    return jsonResponse({ code: "INVALID_BODY", message: "Request body must be valid JSON" }, 400);
  }
  const { action, userId, roleId } = body || {};
  if (!action || !userId || !roleId) {
    return jsonResponse({ code: "MISSING_PARAMS", message: "action, userId and roleId required" }, 400);
  }
  if (action !== "assign" && action !== "revoke") {
    return jsonResponse({ code: "INVALID_ACTION", message: "action must be assign or revoke" }, 400);
  }

  if (action === 'assign') {
    await env.DB.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at) VALUES (?, ?, datetime(\'now\'))').bind(userId, roleId).run();
    // invalidate cache for user
    await authz.invalidateUserRolesCache(env, userId);
    await env.DB.prepare('INSERT OR IGNORE INTO audit_logs (id, actor_id, action, target, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').bind(cryptoRandomId(), actorId, `assign_role:${roleId}`, userId).run();
    return jsonResponse({ message: "Role assigned" }, 200);
  } else {
    await env.DB.prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?').bind(userId, roleId).run();
    await authz.invalidateUserRolesCache(env, userId);
    await env.DB.prepare('INSERT OR IGNORE INTO audit_logs (id, actor_id, action, target, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').bind(cryptoRandomId(), actorId, `revoke_role:${roleId}`, userId).run();
    return jsonResponse({ message: "Role revoked" }, 200);
  }
};

function cryptoRandomId() {
  // simple unique id for audit logs; not cryptographic here
  return 'audit_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
