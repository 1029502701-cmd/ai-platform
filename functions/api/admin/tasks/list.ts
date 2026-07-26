import type { PagesFunction } from '@cloudflare/workers-types';
import { requireAdminAuth, jsonResponse } from '../../../_auth.ts';

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);

  const {request} = context;
  const env = context.env as any;
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('size') || '50'), 200);
  const page = parseInt(url.searchParams.get('page') || '1');
  const offset = (page - 1) * limit;

  let sql = 'SELECT id, type, status, priority, payload, retry_count, locked_by, created_at, started_at, finished_at, last_error FROM ai_tasks';
  const conditions: string[] = [];
  const params: any[] = [];

  if (statusFilter) {
    conditions.push('status = ?');
    params.push(statusFilter);
  }

  conditions.push('1=1'); // placeholder for LIMIT/offset
  if (conditions.length > 1) {
    sql += ' WHERE ' + conditions.filter(c => c !== '1=1').join(' AND ');
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows: any[] = await env.DB.prepare(sql).bind(...params).all();
  const tasks = (rows || []).map((r: any) => ({ ...r, payload: r.payload ? JSON.parse(r.payload) : undefined }));

  return jsonResponse(tasks, 200);
};
