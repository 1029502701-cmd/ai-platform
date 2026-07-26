import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ tenants: [] }, 200);

    const rows: any[] = await db.prepare(
      "SELECT id, tenant_key, name, slug, status, plan, owner_user_id, domain, created_at FROM tenants ORDER BY created_at DESC"
    ).all();

    return jsonResponse({
      tenants: (rows || []).map((r: any) => ({
        id: r.id,
        key: r.tenant_key,
        name: r.name,
        slug: r.slug,
        status: r.status,
        plan: r.plan,
        ownerId: r.owner_user_id,
        domain: r.domain,
        createdAt: r.created_at,
      })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
