import { AIQueueService } from '../../../../shared/services/ai_queue_service';
import { hasRoleForRequest } from '../../../../shared/services/permission';

export const onRequestPost = async (context: any) => {
  const { request, env, params } = context;
  try {
    const id = params?.id || new URL(request.url).pathname.split('/').pop();
    if (!id) return new Response(JSON.stringify({ success: false, error: { code: 'INVALID_PARAMS', message: 'id required' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // Auth: user must be owner or admin
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/session_user=([^;\s]+)/);
    const userId = match ? decodeURIComponent(match[1]) : null;
    if (!userId) return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const service = new AIQueueService(env);
    const task = await service.getTask(id);
    if (!task) return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    const isAdmin = await hasRoleForRequest('admin', { env, request });
    if (task.created_by && task.created_by !== userId && !isAdmin) {
      return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Not allowed to cancel' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Only allow cancelling pending or running tasks; running tasks require worker cooperation to stop
    if (task.status === 'success' || task.status === 'failed' || task.status === 'cancelled') {
      return new Response(JSON.stringify({ success: false, error: { code: 'INVALID_STATE', message: 'Cannot cancel task in current state' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await service.cancelTask(id);
    return new Response(JSON.stringify({ success: true, data: { taskId: id, status: 'cancelled' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: e?.message || 'Server error' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
