import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ subscriptions: [], wallet: null }, 200);

    const userId = auth.user.id;
    const subs: any[] = (await db.prepare(
      "SELECT us.*, bp.name as plan_name, bp.code as plan_code, bp.product_type, bp.credits_amount " +
      "FROM user_subscriptions us JOIN billing_products bp ON bp.id = us.product_id " +
      "WHERE us.user_id = ? AND us.status = '" + "'active'" + "'"
    ).bind(userId).all()) || [];

    // Wallet info
    const wallet: any = await db.prepare("SELECT credits, total_used, mode, status FROM wallets WHERE user_id = ?").bind(userId).first();

    return jsonResponse({
      subscriptions: subs.map((s: any) => ({
        id: s.id, planName: s.plan_name, planCode: s.plan_code,
        productType: s.product_type, status: s.status,
        startAt: s.start_at, expireAt: s.expire_at, autoRenew: s.auto_renew === 1,
      })),
      wallet: wallet ? { credits: wallet.credits, totalUsed: wallet.total_used, status: wallet.status } : null,
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
