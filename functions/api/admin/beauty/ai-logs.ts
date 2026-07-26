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

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const offset = (page - 1) * pageSize;
  const serviceFilter = url.searchParams.get("service");
  const modelFilter = url.searchParams.get("model");
  const statusFilter = url.searchParams.get("status");
  const userIdFilter = url.searchParams.get("userId");

  const whereClauses: string[] = [];
  const bindValues: any[] = [];
  if (serviceFilter) { whereClauses.push("a.service=?"); bindValues.push(serviceFilter); }
  if (modelFilter) { whereClauses.push("a.model LIKE ?"); bindValues.push("%" + modelFilter + "%"); }
  if (statusFilter) { whereClauses.push("a.status=?"); bindValues.push(statusFilter); }
  if (userIdFilter) { whereClauses.push("a.user_id=?"); bindValues.push(userIdFilter); }
  const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

  const totalRow = await db.prepare("SELECT COUNT(*) as cnt FROM ai_usage a " + whereSql).bind(...bindValues).first() as DbRow | undefined;
  const total = Number(totalRow?.cnt ?? 0);

  const selectSql = "SELECT a.id, a.user_id, a.service, a.model, a.input_tokens, a.output_tokens, a.credits_used, a.cost_usd, a.status, a.created_at, a.transaction_id, u.nickname, u.type FROM ai_usage a LEFT JOIN users u ON a.user_id = u.id " + whereSql + " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
  const rowsResult = await db.prepare(selectSql).bind(...bindValues, pageSize, offset).all() as { results?: DbRow[] } | undefined;
  const logs = (rowsResult?.results || []).map((r: DbRow) => ({
    id: r.id, userId: r.user_id, userNickname: r.nickname || null, userType: r.type || null,
    service: r.service, model: r.model,
    inputTokens: r.input_tokens || 0, outputTokens: r.output_tokens || 0,
    tokensTotal: (r.input_tokens || 0) + (r.output_tokens || 0),
    creditsUsed: r.credits_used || 0, costUsd: Number(r.cost_usd ?? 0),
    status: r.status, transactionId: r.transaction_id || null, createdAt: r.created_at,
  }));

  const costRow = await db.prepare("SELECT COALESCE(SUM(cost_usd), 0) as totalCost, COALESCE(SUM(input_tokens + output_tokens), 0) as totalTokens, COUNT(*) as recordCount FROM ai_usage a " + whereSql).bind(...bindValues).first() as DbRow | undefined;

  return jsonResponse({
    logs,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    summary: { totalCost: Number(costRow?.totalCost ?? 0), totalTokens: Number(costRow?.totalTokens ?? 0), recordCount: Number(costRow?.recordCount ?? 0) },
  }, 200);
};
export const onRequestGet = handler;