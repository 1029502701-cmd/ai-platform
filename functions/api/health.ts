import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse } from "../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  try {
    const db = (context.env as any)?.DB;
    const kv = (context.env as any)?.USER_CACHE;

    let dbOk = false;
    let kvOk = false;
    let aiProvidersOk = true;
    let queueOk = false;

    try { if (db?.prepare) { await db.prepare("SELECT 1").first(); dbOk = true; } } catch {}
    try { if (kv) { await kv.get("__hc__"); kvOk = true; } } catch {}

    let activeProviders = 0;
    for (const k of ['OPENAI_API_KEY','DEEPSEEK_API_KEY','ANTHROPIC_API_KEY','GOOGLE_AI_API_KEY']) {
      if ((context.env as any)[k] && String((context.env as any)[k]).length > 3) activeProviders++;
    }
    aiProvidersOk = activeProviders >= 1;
    queueOk = !!((context.env as any)?.AI_TASK_QUEUE);

    return jsonResponse({ status: 'healthy', checks: { database: dbOk ? 'ok' : 'error', cache: kvOk ? 'ok' : 'missing', aiProviders: aiProvidersOk ? `ok(${activeProviders})` : 'warning', queues: queueOk ? 'ok' : 'skipped' } }, 200);
  } catch (e) {
    return jsonResponse({ status: 'error', checks: { all: 'error' } }, 500);
  }
};
