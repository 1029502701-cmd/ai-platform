import { AIQueueService } from '../../../../shared/services/ai_queue_service';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  try {
    const text = await request.text();
  const body = text ? JSON.parse(text) :{};
    const { taskType, payload, priority, max_retry } = body || {};
    if (!taskType) {
      return new Response(JSON.stringify({ success: false, error: { code: 'INVALID_PARAMS', message: 'taskType is required' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Simple auth: read session_user cookie
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/session_user=([^;\s]+)/);
    const userId = match ? decodeURIComponent(match[1]) : null;
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const service = new AIQueueService(env);
    const taskId = await service.submitTask({ type: taskType, payload, priority, created_by: userId, max_retry });
    return new Response(JSON.stringify({ success: true, data: { taskId, status: 'pending' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: e?.message || 'Server error' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
