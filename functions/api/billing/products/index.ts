import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ products: [] }, 200);

    const rows: any[] = await db.prepare(
      "SELECT id, code, name, description, product_type, price_cents, currency, credits_amount, status, sort_order FROM billing_products WHERE status = '" + "'active'" + "' ORDER BY sort_order ASC"
    ).all();

    return jsonResponse({
      products: (rows || []).map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        productType: r.product_type,
        priceCents: r.price_cents,
        currency: r.currency || "CNY",
        creditsAmount: r.credits_amount,
      })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
