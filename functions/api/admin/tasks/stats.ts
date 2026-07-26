import type { PagesFunction } from '@cloudflare/workers-types';
import { requireAdminAuth, jsonResponse } from '../../../_auth.ts';

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);

  const rows: any[] = await (context.env as any).DB.prepare(
    'SELECT status, COUNT(*) as cnt FROM ai_tasks GROUP BY status'
  ).all();

  const stats: Record<string, number> = { total: 0 };
  (rows || []).forEach((r: any) => { stats[r.status] = Number(r.cnt); stats.total += Number(r.cnt); });

  return jsonResponse(stats, 200);
};