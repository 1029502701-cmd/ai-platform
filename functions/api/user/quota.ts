import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse, requireUserAuth } from "../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireUserAuth(context);
    if (!auth) return jsonResponse({ code: "UNAUTHENTICATED", message: "Login required" }, 401);
    const env = context.env as any;
    const db = env.DB;
    const userId = auth.user.id;

    try {
        const quotas: any[] = await db.prepare(
            "SELECT quota_type, total_limit, used_count, next_reset FROM user_quotas WHERE user_id = ?"
        ).bind(userId).all();

        // Fallback to user_usage_limits for daily count
        const usageLimits: any = await db.prepare("SELECT used_count, daily_free_count, reset_time FROM user_usage_limits WHERE user_id = ?").bind(userId).first();

        return jsonResponse({ quotas: quotas || [], usageLimits: usageLimits || null }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
