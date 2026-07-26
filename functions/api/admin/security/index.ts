import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({}, 200);

    // Security overview stats from system_logs
    const logsByModule: any[] = await db.prepare(
      "SELECT module, COUNT(*) as cnt FROM system_logs WHERE date(created_at) = date('now') GROUP BY module"
    ).all();

    const errorCount: any = await db.prepare(
      "SELECT COUNT(*) as total FROM system_logs WHERE level = 'error' AND date(created_at) = date('now')"
    ).first();

    const warnCount: any = await db.prepare(
      "SELECT COUNT(*) as total FROM system_logs WHERE level = 'warn' AND date(created_at) = date('now')"
    ).first();

    // Failed requests (4xx) tracking via module/http logs
    const authFailures: any = await db.prepare(
      "SELECT COUNT(*) as total FROM system_logs WHERE message LIKE '%401%' AND date(created_at) = date('now')"
    ).first();

    // Recent audit actions
    const recentAudits: any[] = await db.prepare(
      "SELECT id, request_id, metadata, created_at FROM system_logs WHERE module = '" + "'audit'" + " ORDER BY created_at DESC LIMIT 20"
    ).all();

    // Provider health failures
    const aiErrors: any = await db.prepare(
      "SELECT COUNT(*) as total FROM system_logs WHERE module = 'ai_core' AND level IN ('error', 'warn') AND date(created_at) = date('now')"
    ).first();

    return jsonResponse({
      todayLogs: {
        info: (logsByModule || []).reduce((a: any, m: any) => a + (m.module !== 'global_error' && m.module !== 'http' ? m.cnt : 0), 0),
        warn: warnCount.total ?? 0,
        error: errorCount.total ?? 0,
      },
      authFailuresToday: authFailures.total ?? 0,
      aiErrorsToday: aiErrors.total ?? 0,
      recentAudits: (recentAudits || []).map((r: any) => ({
        id: r.id,
        timestamp: r.created_at,
        detail: r.metadata ? JSON.parse(String(r.metadata)).action || 'unknown' : 'unknown',
      })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
