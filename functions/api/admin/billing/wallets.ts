import type { PagesFunction } from '@cloudflare/workers-types';
import { requireAdminAuth, jsonResponse } from '../../../_auth.ts';

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);

  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);

  const rows: any[] = await (context.env as any).DB.prepare(
    'SELECT id, user_id, credits, total_used, mode, status, created_at, updated_at FROM wallets ORDER BY credits DESC LIMIT ?'
  ).bind(limit).all();

  return jsonResponse((rows || []).map((r: any) => ({
    ...r, id: r.id, userId: r.user_id,
  })), 200);
};