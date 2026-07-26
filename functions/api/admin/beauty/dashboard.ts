import type { PagesFunction } from "@cloudflare/workers-types";
import type { AuthEnv } from "../../../../shared/auth/types.ts";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

interface DbRow { [key: string]: any; }

const handler = async (context: RequestContext) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);
  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "Database unavailable" }, 500);

  const today = new Date().toISOString().split("T")[0];

  const totalRow = await db.prepare("SELECT COUNT(*) as cnt FROM beauty_reports").first() as DbRow | undefined;
  const todayRow = await db.prepare("SELECT COUNT(*) as cnt FROM beauty_reports WHERE date(created_at)=?").bind(today).first() as DbRow | undefined;
  const guestRow = await db.prepare("SELECT COUNT(*) as cnt FROM beauty_reports r JOIN users u ON r.user_id = u.id WHERE u.type='guest'").first() as DbRow | undefined;
  const userRow = await db.prepare("SELECT COUNT(*) as cnt FROM beauty_reports r JOIN users u ON r.user_id = u.id WHERE u.type!='guest'").first() as DbRow | undefined;
  const beautyCallsRow = await db.prepare("SELECT COUNT(*) as cnt FROM ai_usage WHERE service='beauty_analysis'").first() as DbRow | undefined;
  const beautyCostRow = await db.prepare("SELECT COALESCE(SUM(cost_usd),0) as cost FROM ai_usage WHERE service='beauty_analysis'").first() as DbRow | undefined;
  const totalAiCallsRow = await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks").first() as DbRow | undefined;
  const failedRow = await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks WHERE status='failed'").first() as DbRow | undefined;
  const totalAiCostRow = await db.prepare("SELECT COALESCE(SUM(cost_usd),0) as cost FROM ai_usage").first() as DbRow | undefined;
  const avgRow = await db.prepare("SELECT CAST((strftime('%s','finished_at') - strftime('%s','started_at')) AS REAL) as avg_ms FROM ai_tasks WHERE type='beauty.analyze' AND started_at IS NOT NULL AND finished_at IS NOT NULL ORDER BY avg_ms DESC LIMIT 1").first() as DbRow | undefined;

  const totalAnalyses = Number(totalRow?.cnt ?? 0);
  const failedCnt = Number(failedRow?.cnt ?? 0);
  const totalAiCnt = Number(totalAiCallsRow?.cnt ?? 0);

  return jsonResponse({
    totalAnalyses,
    todayAnalyses: Number(todayRow?.cnt ?? 0),
    guestAnalyses: Number(guestRow?.cnt ?? 0),
    userAnalyses: Number(userRow?.cnt ?? 0),
    totalBeautyAiCalls: Number(beautyCallsRow?.cnt ?? 0),
    beautyAiCost: Number(beautyCostRow?.cost ?? 0),
    totalAiCalls: totalAiCnt,
    totalAiCost: Number(totalAiCostRow?.cost ?? 0),
    failedAiTasks: failedCnt,
    avgTaskDurationMs: Number(avgRow?.avg_ms ?? 0),
    failureRate: totalAiCnt > 0 ? Number((failedCnt / totalAiCnt * 100).toFixed(2)) : 0,
  }, 200);
};
export const onRequestGet = handler;