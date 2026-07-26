import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";
import { getMetricsSnapshot } from "../../../../shared/performance.ts";
import { getProviderHealthSnapshot } from "../../../../shared/ai/provider_health.ts";
import { getTaskStats } from "../../../../shared/task_metrics.ts";
import { getStats as getQueueStats } from "../../../../packages/queue/scheduler.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
  try {
    const db = (context.env as any)?.DB;
    const now = new Date().toISOString().slice(0, 10);

    // Collect all metrics
    const metrics = getMetricsSnapshot(1); // last 24h
    const providerHealth = getProviderHealthSnapshot();
    const taskStats = getTaskStats();
    const queueStats = getQueueStats();

    // DB query for recent performance data
    let aiDurationStats: any = null;
    let apiLatencyStats: any = null;
    if (db?.prepare) {
      try {
        aiDurationStats = await db.prepare(
          "SELECT AVG(duration_ms) as avg_ms, MIN(duration_ms) as min_ms, MAX(duration_ms) as max_ms, COUNT(*) as cnt FROM ai_usage WHERE date(created_at) = ?"
        ).bind(now).first();
      } catch {}
      try {
        apiLatencyStats = await db.prepare(
          "SELECT AVG(duration_ms) as avg_ms, COUNT(*) as cnt FROM system_logs WHERE module = 'http' AND date(created_at) = ?"
        ).bind(now).first();
      } catch {}
    }

    return jsonResponse({
      metrics,
      providerHealth,
      task: taskStats,
      queue: queueStats,
      ai: aiDurationStats ? {
        avg_duration_ms: aiDurationStats.avg_ms,
        min_duration_ms: aiDurationStats.min_ms,
        max_duration_ms: aiDurationStats.max_ms,
        total_calls: aiDurationStats.cnt,
      } : null,
      http: apiLatencyStats ? {
        avg_response_ms: apiLatencyStats.avg_ms,
        total_requests: apiLatencyStats.cnt,
      } : null,
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
