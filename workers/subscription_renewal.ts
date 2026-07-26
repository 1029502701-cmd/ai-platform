// Subscription auto-renewal worker — runs via Cloudflare cron
// Scheduled to run daily at midnight UTC
// Expires old subscriptions, renews active ones with auto_renew=1

export default {
  async scheduled(controller: any, env: any, ctx: any): Promise<void> {
    const db = env.DB;
    if (!db?.prepare) return;

    try {
      // 1. Expire past-due subscriptions
      await db.prepare(
        "UPDATE user_subscriptions SET status = 'expired', updated_at = datetime('now') " +
        "WHERE status = 'active' AND expire_at < datetime('now')"
      ).run();

      // 2. Renew subscriptions with auto_renew=1 that are about to expire (within 7 days) or already expired within 30 days
      const expiringSubs: any[] = await db.prepare(
        "SELECT us.*, bp.id as product_id, bp.code as plan_code, bp.price_cents FROM user_subscriptions us " +
        "JOIN billing_products bp ON bp.id = us.product_id " +
        "WHERE us.status = 'active' AND us.auto_renew = 1 " +
        "AND (us.expire_at < datetime('now', '+7 days') OR us.expire_at IS NULL)"
      ).all();

      for (const sub of (expiringSubs || [])) {
        // Extend by 30 days
        const newExpire = sub.expire_at && sub.expire_at > new Date().toISOString().slice(0, 10)
          ? `datetime('${sub.expire_at}', '+30 days')`
          : "datetime('now', '+30 days')";

        await db.prepare(
          "UPDATE user_subscriptions SET expire_at = " + newExpire + ", updated_at = datetime('now') WHERE id = ?"
        ).run(sub.id);

        // Log transaction
        await db.prepare(
          "INSERT INTO billing_transactions (user_id, subscription_id, tx_type, amount_cents, reason) VALUES (?, ?, '" + "'grant'" + "', 0, '" + "'subscription_auto_renew'" + "')"
        ).run(sub.user_id, sub.id);
      }

      console.log("[Subscription Renewal] Expired " + (expiringSubs?.length ?? 0) + " subscriptions");
    } catch (e) {
      console.error("[Subscription Renewal] Error:", e);
    }
  },
};