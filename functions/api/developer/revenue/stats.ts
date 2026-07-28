import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse } from "../../../_auth";

const handler: PagesFunction = async (context) => {
  const { env, request, params } = context;
  
  const developerId = getDeveloperIdFromRequest(request);
  if (!developerId) {
    return jsonResponse({ code: "UNAUTHORIZED", message: "Developer authentication required" }, 401);
  }

  try {
    const statsQuery = \
      SELECT 
        COUNT(*) as totalTransactions,
        SUM(gross_amount) as totalGross,
        SUM(platform_fee) as totalPlatformFee,
        SUM(developer_amount) as totalDeveloperAmount,
        COUNT(DISTINCT plugin_id) as uniquePlugins,
        COUNT(DISTINCT user_id) as uniqueUsers
      FROM plugin_revenue_transactions
      WHERE developer_id = ? AND status = 'completed'
    \;
    const statsResult = await env.DB.query(statsQuery, [developerId]);
    const stats = statsResult[0] || { totalTransactions: 0, totalGross: 0, totalPlatformFee: 0, totalDeveloperAmount: 0, uniquePlugins: 0, uniqueUsers: 0 };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyQuery = \
      SELECT COUNT(*) as count, SUM(developer_amount) as amount
      FROM plugin_revenue_transactions
      WHERE developer_id = ? AND created_at >= ? AND status = 'completed'
    \;
    const weeklyResult = await env.DB.query(weeklyQuery, [developerId, oneWeekAgo.toISOString()]);
    const weeklyStats = weeklyResult[0] || { count: 0, amount: 0 };

    return jsonResponse({
      success: true,
      data: {
        summary: {
          totalTransactions: stats.totalTransactions,
          totalGrossAmount: stats.totalGross,
          totalPlatformFee: stats.totalPlatformFee,
          totalDeveloperRevenue: stats.totalDeveloperAmount,
          uniquePlugins: stats.uniquePlugins,
          uniqueUsers: stats.uniqueUsers
        },
        lastWeek: {
          transactionCount: weeklyStats.count,
          revenueAmount: weeklyStats.amount
        },
        currency: "CNY"
      }
    }, 200);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return jsonResponse({ code: "INTERNAL_ERROR", message: "Failed to retrieve statistics" }, 500);
  }
};

function getDeveloperIdFromRequest(request: Request): string | null {
  return null;
}

export const GET = handler;
