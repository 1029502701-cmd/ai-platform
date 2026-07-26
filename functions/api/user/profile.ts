import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse, requireUserAuth } from "../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireUserAuth(context);
    if (!auth) return jsonResponse({ code: "UNAUTHENTICATED", message: "Login required" }, 401);
    const env = context.env as any;
    const db = env.DB;
    const userId = auth.user.id;

    try {
        const user: any = await db.prepare("SELECT id, nickname, avatar, type, role, status, created_at, last_login_at FROM users WHERE id = ?").bind(userId).first();
        if (!user) return jsonResponse({ code: "NOT_FOUND" }, 404);

        // Usage today
        const usageToday: any = await db.prepare(
            "SELECT COUNT(*) as calls, COALESCE(SUM(tokens_total),0) as tokens, COALESCE(SUM(cost_usd),0) as cost FROM ai_usage WHERE created_by = ? AND date(created_at) = date('now')"
        ).bind(userId).first();

        // Plan info
        const planAssign: any = await db.prepare("SELECT plan_name FROM user_plan_assignments WHERE user_id = ?").bind(userId).first();

        return jsonResponse({
            profile: { ...user, planName: planAssign?.plan_name || "free" },
            usageToday: { calls: usageToday?.calls ?? 0, tokens: usageToday?.tokens ?? 0, cost: usageToday?.cost ?? 0 },
        }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};

export const onRequestPatch = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireUserAuth(context);
    if (!auth) return jsonResponse({ code: "UNAUTHENTICATED", message: "Login required" }, 401);
    const env = context.env as any;
    const db = env.DB;
    const userId = auth.user.id;

    try {
        const body = await context.request.json() as any;
        const fields: string[] = [];
        const params: any[] = [];
        if (body.nickname) { fields.push("nickname=?"); params.push(body.nickname); }
        if (body.avatar) { fields.push("avatar=?"); params.push(body.avatar); }
        if (fields.length === 0) return jsonResponse({ code: "NO_FIELDS" }, 400);
        params.push(userId);
        await db.prepare("UPDATE users SET " + fields.join(",") + " WHERE id=?").bind(...params).run();
        return jsonResponse({ success: true }, 200);
    } catch (e) {
        return jsonResponse({ code: "UPDATE_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
