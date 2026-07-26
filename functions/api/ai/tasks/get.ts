import { AIQueueService } from '../../../../shared/services/ai_queue_service.ts';

export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;
  try {
    const id = params?.id || new URL(request.url).pathname.split('/').pop();
    if (!id) return new Response(JSON.stringify({ success: false, error: { code: 'INVALID_PARAMS', message: 'id required' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // Auth: only allow owner to query
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/session_user=([^;\s]+)/);
    const userId = match ? decodeURIComponent(match[1]) : null;
    if (!userId) return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const service = new AIQueueService(env);
    const task = await service.getTask(id);
    if (!task) return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    if (task.created_by && task.created_by !== userId) return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });

    const resp = {
      taskId: task.id,
      status: task.status,
      result: task.result ?? null,
      createdAt: task.created_at,
      completedAt: task.finished_at ?? null
    };
    return new Response(JSON.stringify({ success: true, data: resp }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: e?.message || 'Server error' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
