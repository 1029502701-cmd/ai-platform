import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return new Response(JSON.stringify({ apps: [] }), { headers: { 'Content-Type': 'application/json' } });
    const rows: any[] = await db.prepare("SELECT id, slug, name, description, category, icon_url, rating, install_count, price_cents, version FROM marketplace_apps WHERE status = 'published' ORDER BY rating DESC, install_count DESC").all();
    return new Response(JSON.stringify({ apps: rows || [] }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  try {
    const body = await context.request.json() as any;
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return new Response(JSON.stringify({ error: 'No DB' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    const existing: any = await db.prepare("SELECT id FROM marketplace_app_installs WHERE user_id = ? AND app_slug = ? AND status = 'active'").bind(1, body.appSlug).first();
    if (existing) return new Response(JSON.stringify({ success: true, message: 'Already installed' }), { headers: { 'Content-Type': 'application/json' } });
    await db.prepare("INSERT INTO marketplace_app_installs (user_id, app_slug, version) VALUES (?, ?, ?)").run(1, body.appSlug, null);
    await db.prepare("UPDATE marketplace_apps SET install_count = install_count + 1 WHERE slug = ?").run(body.appSlug);
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
};