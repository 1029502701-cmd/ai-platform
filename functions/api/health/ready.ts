import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse } from "../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  try {
    const db = (context.env as any)?.DB;
    let ready = false;
    if (db?.prepare) { await db.prepare("SELECT 1").first(); ready = true; }
    return jsonResponse({ status: ready ? 'ready' : 'not_ready', dbConnected: ready }, ready ? 200 : 503);
  } catch {
    return jsonResponse({ status: 'not_ready', dbConnected: false }, 503);
  }
};
