import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";
import { TenantService } from "../../../../shared/tenant/index.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);

  try {
    const body = await context.request.json() as any;
    const { name, key, slug, ownerId, domain } = body;

    if (!name || !key || !slug) {
      return jsonResponse({ code: "MISSING_FIELDS", message: "name, key, slug are required" }, 400);
    }

    const tenant = await TenantService.createTenant(context.env as any, {
      name,
      key,
      slug,
      plan: body.plan || 'free',
      ownerId: parseInt(String(ownerId)),
      domain,
    });

    if (!tenant) {
      return jsonResponse({ code: "CREATE_FAILED" }, 500);
    }

    return jsonResponse(tenant, 201);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};