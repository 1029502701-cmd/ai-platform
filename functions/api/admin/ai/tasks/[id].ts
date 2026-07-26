import { AdminTaskService } from '../../../../../shared/services/admin_task_service.ts';
import { hasRoleForRequest } from '../../../../../shared/services/permission.ts';

export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'admin only' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  try {
    const id = params?.id || new URL(request.url).pathname.split('/').pop();
    if (!id) return new Response(JSON.stringify({ success: false, error: { code: 'INVALID_PARAMS', message: 'id required' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const service = new AdminTaskService(env);
    const task = await service.getTaskDetail(id);
    if (!task) return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ success: true, data: task }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: e?.message || 'Server error' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
