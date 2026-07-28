import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";
import { getBeautyEventService } from "../../../../shared/services/beauty/BeautyEventService";

export const onRequestGet = async (context: any) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);

  const db = context.env?.DB;
  if (!db) return jsonResponse({ error: "Database unavailable" }, 500);

  const eventService = getBeautyEventService(db);
  if (!eventService) return jsonResponse({ error: "Event service not available" }, 500);

  try {
    const stats = await eventService.getEventStats();

    const totalUsersResult = await db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM beauty_events WHERE user_id IS NOT NULL").first();
    const today = new Date().toISOString().split("T")[0];
    const todayAnalysesResult = await db.prepare("SELECT COUNT(*) as count FROM beauty_events WHERE event_type LIKE ? AND created_at >= ?").bind("analysis%", today + "T00:00:00").first();

    const response = {
      totalUsers: totalUsersResult?.count || 0,
      totalAnalyses: stats.totalAnalyses,
      successRate: stats.successRate,
      failedCount: stats.failedCount,
      averageDuration: 0,
      todayUsage: todayAnalysesResult?.count || 0,
      timestamp: new Date().toISOString(),
    };

    return jsonResponse(response, 200);
  } catch (error) {
    console.error("[BeautyMetrics] Error:", error);
    return jsonResponse({ error: "Failed to calculate metrics" }, 500);
  }
};
