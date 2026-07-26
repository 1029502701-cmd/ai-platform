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
  const userId = url.searchParams.get("userId") || null;
  const dateFrom = url.searchParams.get("dateFrom") || null;
  const dateTo = url.searchParams.get("dateTo") || null;
  const faceShape = url.searchParams.get("faceShape") || null;

  const whereClauses: string[] = [];
  const bindValues: any[] = [];
  if (userId) { whereClauses.push("r.user_id=?"); bindValues.push(userId); }
  if (dateFrom) { whereClauses.push("date(r.created_at)>=?"); bindValues.push(dateFrom); }
  if (dateTo) { whereClauses.push("date(r.created_at)<=?"); bindValues.push(dateTo); }
  if (faceShape) { whereClauses.push("JSON_EXTRACT(r.report_json,'$.faceShape.shape')=?"); bindValues.push(faceShape); }
  const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

  const totalRow = await db.prepare("SELECT COUNT(*) as cnt FROM beauty_reports r " + whereSql).bind(...bindValues).first() as DbRow | undefined;
  const totalCount = Number(totalRow?.cnt ?? 0);

  const sql = "SELECT r.id, r.user_id, r.report_json, r.share_image_url, r.image_key, r.created_at, u.nickname, u.type FROM beauty_reports r LEFT JOIN users u ON r.user_id = u.id " + whereSql + " ORDER BY r.created_at DESC LIMIT ? OFFSET ?";
  const rowsResult = await db.prepare(sql).bind(...bindValues, pageSize, offset).all() as { results?: DbRow[] } | undefined;
  const results = (rowsResult?.results || []).map((row: DbRow) => {
    let reportData: any = {};
    try { reportData = JSON.parse(row.report_json || "{}"); } catch {}
    return {
      id: row.id, userId: row.user_id, userNickname: row.nickname || null, userType: row.type || null,
      report: { faceShape: reportData.faceShape?.shape || null, makeup: reportData.makeup?.base || null, overallHarmony: reportData.features?.overallHarmony || null },
      shareImageUrl: row.share_image_url || null, imageKey: row.image_key || null, createdAt: row.created_at,
    };
  });

  return jsonResponse({
    reports: results,
    pagination: { page, pageSize, total: totalCount, totalPages: Math.ceil(totalCount / pageSize) },
  }, 200);
};
export const onRequestGet = handler;