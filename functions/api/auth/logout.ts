import type { PagesFunction } from "@cloudflare/workers-types";
import { getSession } from "../../../shared/auth/session.ts";
import { readSessionId } from "../../../shared/auth/cookies.ts";
import { jsonResponse, requireUserAuth } from "../../_auth.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
    try {
        const auth = await requireUserAuth(context);
        if (!auth) return jsonResponse({ code: "UNAUTHENTICATED", message: "Login required" }, 401);

        // Delete session cookie
        const response = new Response(JSON.stringify({ success: true, message: "Logged out" }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
        response.headers.set("Set-Cookie", "sessionId=; Path=/; Max-Age=0; HttpOnly; Secure");
        return response;
    } catch (e) {
        return jsonResponse({ code: "LOGOUT_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};