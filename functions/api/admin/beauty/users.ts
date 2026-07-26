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
  const userIdParam = url.searchParams.get("id");

  if (userIdParam) {
    const user = await db.prepare("SELECT id, nickname, type, role, status, created_at, updated_at FROM users WHERE id=? LIMIT 1").bind(userIdParam).first() as DbRow | undefined;
    if (!user) return jsonResponse({ error: "User not found" }, 404);
    const profile = await db.prepare("SELECT * FROM beauty_profiles WHERE user_id=? LIMIT 1").bind(userIdParam).first() as DbRow | undefined;
    const lastReport = await db.prepare("SELECT id, created_at, report_json FROM beauty_reports WHERE user_id=? ORDER BY created_at DESC LIMIT 1").bind(userIdParam).first() as DbRow | undefined;
    let lastReportData: any = {};
    try { lastReportData = JSON.parse(lastReport?.report_json || "{}"); } catch {}
    return jsonResponse({
      user, beautyProfile: profile,
      lastAnalysis: lastReport ? { id: lastReport.id, createdAt: lastReport.created_at, faceShape: lastReportData.faceShape?.shape || null, makeup: lastReportData.makeup?.base || null, harmony: lastReportData.features?.overallHarmony || null } : null,
    }, 200);
  }

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const offset = (page - 1) * pageSize;

  const totalRow = await db.prepare("SELECT COUNT(*) as cnt FROM users u WHERE u.role IN('user','admin','super_admin')").first() as DbRow | undefined;
  const totalCount = Number(totalRow?.cnt ?? 0);
  const rowsResult = await db.prepare("SELECT u.id, u.nickname, u.type, u.role, u.status, u.created_at, COALESCE(bp.analysis_count, 0) as analysis_count, bp.current_face_shape FROM users u LEFT JOIN beauty_profiles bp ON u.id = bp.user_id WHERE u.role IN('user','admin','super_admin') ORDER BY u.created_at DESC LIMIT ? OFFSET ?").bind(pageSize, offset).all() as { results?: DbRow[] } | undefined;
  const results = (rowsResult?.results || []).map((r: DbRow) => ({
    id: r.id, nickname: r.nickname, type: r.type, role: r.role, status: r.status, createdAt: r.created_at,
    analysisCount: r.analysis_count || 0, currentFaceShape: r.current_face_shape || null,
  }));

  return jsonResponse({
    users: results,
    pagination: { page, pageSize, total: totalCount, totalPages: Math.ceil(totalCount / pageSize) },
  }, 200);
};
export const onRequestGet = handler;