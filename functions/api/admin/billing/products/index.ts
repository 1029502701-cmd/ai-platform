import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ products: [] }, 200);

    const rows: any[] = await db.prepare(
      "SELECT id, code, name, description, product_type, price_cents, currency, credits_amount, status FROM billing_products ORDER BY sort_order ASC"
    ).all();

    return jsonResponse({
      products: (rows || []).map((r: any) => ({
        ...r, creditsAmount: r.credits_amount, priceCents: r.price_cents,
      })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};