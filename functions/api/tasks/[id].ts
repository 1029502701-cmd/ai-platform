import { getSession } from '../../../shared/auth/session.ts';
import { readSessionId } from '../../../shared/auth/cookies.ts';
import type { PagesFunction } from '@cloudflare/workers-types';

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const { request, params } = context;
  const env = context.env as any;

  // Authenticate user
  const cookieHeader = request.headers.get('cookie') || null;
  const sessionId = readSessionId(cookieHeader);
  const session = sessionId ? await getSession(env, sessionId) : null;
  if (!session || !session.user?.id) {
    return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const taskId = params?.id;
  if (!taskId) return new Response(JSON.stringify({ success: false, error: { code: 'INVALID_PARAMS', message: 'task id required' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const row = await env.DB.prepare('SELECT * FROM ai_tasks WHERE id = ?').get(taskId);
  if (!row) return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  // Only allow owners to view their own tasks
  if (row.created_by && row.created_by !== session.user.id) {
    return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    success: true,
    data: {
      taskId: row.id,
      status: row.status,
      priority: row.priority,
      payload: row.payload ? JSON.parse(row.payload) : null,
      result: row.result ? JSON.parse(row.result) : null,
      retryCount: row.retry_count,
      maxRetry: row.max_retry,
      lastError: row.last_error,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};