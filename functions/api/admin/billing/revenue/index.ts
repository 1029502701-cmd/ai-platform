import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({}, 200);

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

    // Today's revenue
    const todayRev: any = await db.prepare("SELECT COALESCE(SUM(amount_cents), 0) as total, COUNT(*) as count FROM billing_orders WHERE date(paid_at) = ? AND status = '" + "'paid'" + "'").bind(today).first();

    // Monthly revenue
    const monthRev: any = await db.prepare("SELECT COALESCE(SUM(amount_cents), 0) as total, COUNT(*) as count FROM billing_orders WHERE date(created_at) >= ? AND status = '" + "'paid'" + "'").bind(monthStart).first();

    // Total orders by status
    const ordersByStatus: any = await db.prepare("SELECT status, COUNT(*) as cnt FROM billing_orders GROUP BY status").all();

    // Active subscriptions count
    const activeSubs: any = await db.prepare("SELECT COUNT(*) as cnt FROM user_subscriptions WHERE status = '" + "'active'" + "'").first();

    // Recent transactions summary
    const recentTxs: any = await db.prepare("SELECT tx_type, COUNT(*) as cnt, COALESCE(SUM(amount_cents), 0) as total FROM billing_transactions WHERE date(created_at) = ? GROUP BY tx_type").bind(today).all();

    return jsonResponse({
      todayRevenue: todayRev.total ?? 0,
      todayOrders: todayRev.count ?? 0,
      monthRevenue: monthRev.total ?? 0,
      monthOrders: monthRev.count ?? 0,
      activeSubscriptions: activeSubs.cnt ?? 0,
      ordersByStatus: (ordersByStatus || []).reduce((a: any, o: any) => { a[o.status] = o.cnt; return a; }, {}),
      dailyBreakdown: (recentTxs || []).map((r: any) => ({ txType: r.tx_type, count: r.cnt, totalCents: r.total })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
