import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse } from "../../../_auth";
import { db } from "../../../../drizzle";

const handler: PagesFunction = async (context) => {
  const { env, request, params } = context;
  
  const developerId = getDeveloperIdFromRequest(request);
  if (!developerId) {
    return jsonResponse({ code: "UNAUTHORIZED", message: "Developer authentication required" }, 401);
  }

  try {
    // Get query parameters for pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;

    // Fetch transactions for this developer with plugin info
    const query = `
      SELECT prt.id, prt.plugin_id, prt.developer_id, prt.user_id, prt.transaction_type, 
             prt.gross_amount, prt.platform_fee, prt.developer_amount, prt.currency, prt.status, prt.created_at,
             p.name AS plugin_name
      FROM plugin_revenue_transactions prt
      JOIN plugins p ON prt.plugin_id = p.plugin_id
      WHERE prt.developer_id = ?
      ORDER BY prt.created_at DESC LIMIT ? OFFSET ?
    `;
    const results = await env.DB.query(query, [developerId, limit, offset]);

    // Count total
    const countResult = await env.DB.prepare("SELECT COUNT(*) as total FROM plugin_revenue_transactions WHERE developer_id = ?").first([developerId]);
    const total = countResult?.total || 0;

    return jsonResponse({
      success: true,
      data: {
        transactions: results.map(r => ({
          id: r.id,
          pluginId: r.plugin_id,
          userId: r.user_id,
          transactionType: r.transaction_type,
          grossAmount: r.gross_amount,
          platformFee: r.platform_fee,
          developerAmount: r.developer_amount,
          currency: r.currency,
          status: r.status,
          createdAt: r.created_at,
          pluginName: r.plugin_name
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    }, 200);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return jsonResponse({ code: "INTERNAL_ERROR", message: "Failed to retrieve transactions" }, 500);
  }
};

function getDeveloperIdFromRequest(request: Request): string | null {
  return null; // Placeholder implementation
}

export const GET = handler;

