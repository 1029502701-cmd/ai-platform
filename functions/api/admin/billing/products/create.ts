import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../../_auth.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
  try {
    const db = (context.env as any)?.DB;
    const body = await context.request.json() as any;
    if (!body.code || !body.name) return jsonResponse({ code: "BAD_REQUEST", message: "code and name required" }, 400);

    const res: any = await db.prepare(
      "INSERT INTO billing_products (code, name, description, product_type, price_cents, currency, credits_amount, features, status) VALUES (?, ?, ?, '" + "'plan'" + "', ?, '" + "'CNY'" + "', ?, NULL, '" + "'active'" + "')"
    ).run(body.code, body.name, body.description || null, body.priceCents || 0, body.creditsAmount || 0);

    return jsonResponse({ success: true, productId: res.lastInsertRowid }, 201);
  } catch (e) {
    return jsonResponse({ code: "CREATE_ERROR", message: String(e) }, 500);
  }
};
