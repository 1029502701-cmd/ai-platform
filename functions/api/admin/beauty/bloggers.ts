import type { PagesFunction } from "@cloudflare/workers-types";
import type { AuthEnv } from "../../../../shared/auth/types.ts";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";
type RQ = Parameters<PagesFunction<AuthEnv>>[0];
interface DR { [k: string]: any; }
const handler = async (ctx: RQ) => {
  const auth = await requireAdminAuth(ctx);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);
  const db = ctx.env.DB;
  if (!db) return jsonResponse({ error: "Database unavailable" }, 500);
  const url = new URL(ctx.request.url);
  const method = ctx.request.method;
  if (method === "GET") {
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const ps = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20")));
    const off = (page - 1) * ps;
    const platform = url.searchParams.get("platform");
    const where = platform ? "WHERE platform=?" : "";
    const bnds = platform ? [platform] : [];
    const totalRow = await db.prepare("SELECT COUNT(*) as cnt FROM beauty_bloggers " + where).bind(...bnds).first();
    const total = Number(totalRow?.cnt ?? 0);
    const rowsResult = await db.prepare("SELECT * FROM beauty_bloggers " + where + " ORDER BY followers DESC LIMIT ? OFFSET ?").bind(...bnds, ps, off).all() as { results?: DR[] };
    const items = (rowsResult?.results || []).map((r: DR) => ({ id: r.id, name: r.name, platform: r.platform, followers: Number(r.followers || 0), avatar_url: r.avatar_url, profile_url: r.profile_url, status: r.status, created_at: r.created_at, updated_at: r.updated_at }));
    return jsonResponse({ bloggers: items, pagination: { page, pageSize: ps, total, totalPages: Math.ceil(total / ps) } }, 200);
  }
  if (method === "POST") {
    const body = await ctx.request.json() as any;
    const id = "bb_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO beauty_bloggers (id,name,platform,avatar_url,profile_url,followers,style_tags,face_tags,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id, body.name||"", body.platform||"", body.avatar_url||"", body.profile_url||null, Number(body.followers||0), JSON.stringify(body.style_tags||[]), JSON.stringify(body.face_tags||[]), body.status||"active", now, now).run();
    return jsonResponse({ id }, 201);
  }
  if (method === "PATCH") {
    const body = await ctx.request.json() as any;
    const pid = body.id;
    if (!pid) return jsonResponse({ error: "Missing id" }, 400);
    const keys: string[] = [];
    const vals: any[] = [];
    for (const k of ["name","platform","avatar_url","profile_url","followers","style_tags","face_tags","status"]) {
      if (body[k] !== undefined) { keys.push(k + "=?"); vals.push(body[k]); }
    }
    if (keys.length > 0) { keys.push("updated_at=?"); vals.push(new Date().toISOString()); vals.push(pid); await db.prepare("UPDATE beauty_bloggers SET " + keys.join(",") + " WHERE id=?").bind(...vals).run(); }
    return jsonResponse({ ok: true }, 200);
  }
  if (method === "DELETE") {
    const did = url.searchParams.get("id");
    if (!did) return jsonResponse({ error: "Missing id" }, 400);
    await db.prepare("DELETE FROM beauty_bloggers WHERE id=?").bind(did).run();
    return jsonResponse({ ok: true }, 200);
  }
  return jsonResponse({ error: "Method not allowed" }, 405);
};
export const onRequestGet = handler;
export const onRequestPost = handler;
export const onRequestPatch = handler;
