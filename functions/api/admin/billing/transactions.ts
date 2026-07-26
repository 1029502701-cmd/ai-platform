import type { PagesFunction } from '@cloudflare/workers-types';
import { requireAdminAuth, jsonResponse } from '../../../_auth.ts';

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = (page - 1) * limit;

  const rows: any[] = await (context.env as any).DB.prepare(
    'SELECT id, user_id, type, amount, service, model, cost_usd, transaction_id, created_at FROM transactions ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  return jsonResponse((rows || []).map((r: any) => ({
    ...r, id: r.id, userId: r.user_id, type: r.type, amount: r.amount,
    service: r.service, model: r.model, costUsd: r.cost_usd,
    transactionId: r.transaction_id, createdAt: r.created_at,
  })), 200);
};