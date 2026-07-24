import { getSession } from '../../shared/auth/session';
import { readSessionId } from '../../shared/auth/cookies';
import * as authz from '../../shared/auth/authorization_rbac';
import type { PagesFunction } from "@cloudflare/workers-types";
import type { AuthEnv } from "../../shared/auth/types";

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

function jsonResponse(data: unknown, status: number): Response {
  const success = status < 400;
  return new Response(
    JSON.stringify({ success, data: success ? data : null, error: success ? null : data, meta: {} }),
    { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } },
  );
}

// Minimal admin roles API: GET /api/admin-roles -> list roles & permissions
export const onRequestGet = async (context: RequestContext) => {
  const { env, request } = context;
  const cookieHeader = request.headers.get('cookie') || null;
  const sessionId = readSessionId(cookieHeader);
  const session = sessionId ? await getSession(env, sessionId) : null;
  if (!session || !session.user?.id) {
    return jsonResponse({ code: "UNAUTHENTICATED", message: "Authentication required" }, 401);
  }
  const userId = session.user.id;
  const ok = await authz.hasPermission(env, userId, 'admin.roles.manage');
  if (!ok) {
    return jsonResponse({ code: "FORBIDDEN", message: "Insufficient permissions" }, 403);
  }

  const rolesRes = await env.DB.prepare('SELECT id, name, description, created_at FROM roles').all();
  const permsRes = await env.DB.prepare('SELECT id, name, description FROM permissions').all();
  const rolePermsRes = await env.DB.prepare('SELECT role_id, permission_id FROM role_permissions').all();

  const roles = (rolesRes.results || []).map((r: any) => ({ id: r.id, name: r.name, description: r.description, created_at: r.created_at }));
  const permissions = (permsRes.results || []).map((p: any) => ({ id: p.id, name: p.name, description: p.description }));
  const rolePermissions = (rolePermsRes.results || []).map((rp: any) => ({ role_id: rp.role_id, permission_id: rp.permission_id }));

  return jsonResponse({ roles, permissions, rolePermissions }, 200);
};
