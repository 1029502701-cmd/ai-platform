import type { PagesFunction } from '@cloudflare/workers-types';
import { requireAdminAuth, jsonResponse } from '../../../_auth.ts';

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);

  const taskId = context.params?.id;
  if (!taskId) return jsonResponse({ error: 'task_id_required' }, 400);

  const row: any = await (context.env as any).DB.prepare('SELECT * FROM ai_tasks WHERE id = ?').bind(taskId).first();
  if (!row) return jsonResponse({ error: 'task_not_found' }, 404);

  const task = { ...row, payload: row.payload ? JSON.parse(row.payload) : undefined, result: row.result ? JSON.parse(row.result) : undefined };
  return jsonResponse(task, 200);
};