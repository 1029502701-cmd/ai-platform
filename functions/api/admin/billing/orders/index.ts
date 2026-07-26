import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ orders: [], pagination: {} }, 200);

    const url = new URL(context.request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = (page - 1) * limit;

    let query = "SELECT id, order_no, user_id, product_id, amount_cents, currency, status, payment_provider, payment_ref, created_at FROM billing_orders";
    const bindings: any[] = [];

    const statusFilter = url.searchParams.get('status');
    if (statusFilter) {
      query += " WHERE status = '" + statusFilter + "'";
    }

    const userIdParam = url.searchParams.get('userId');
    if (userIdParam) {
      if (!query.includes("WHERE")) {
        query += " WHERE";
      } else {
        query += " AND";
      }
      query += " user_id = ?";
      bindings.push(parseInt(userIdParam));
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);

    const rows: any[] = await db.prepare(query).bind(...bindings).all();

    // Count total
    let countQuery = "SELECT COUNT(*) as total FROM billing_orders";
    if (statusFilter) {
      countQuery += " WHERE status = '" + statusFilter + "'";
    }
    const bindForCount: any[] = [];
    const userIdParam2 = url.searchParams.get('userId');
    if (userIdParam2) {
      if (!countQuery.includes("WHERE")) {
        countQuery += " WHERE";
      } else {
        countQuery += " AND";
      }
      countQuery += " user_id = ?";
      bindForCount.push(parseInt(userIdParam2));
    }
    const countResult: any = await db.prepare(countQuery).bind(...bindForCount).first();

    return jsonResponse({
      orders: (rows || []).map((r: any) => ({
        id: r.id,
        orderNo: r.order_no,
        userId: r.user_id,
        amountCents: r.amount_cents,
        currency: r.currency,
        status: r.status,
        paymentProvider: r.payment_provider,
        createdAt: r.created_at,
      })),
      pagination: {
        page,
        limit,
        total: countResult?.total ?? 0,
        totalPages: Math.ceil((countResult?.total ?? 0) / limit),
      },
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
