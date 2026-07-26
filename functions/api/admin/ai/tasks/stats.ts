import { AdminTaskService } from '../../../../../shared/services/admin_task_service.ts';
import { hasRoleForRequest } from '../../../../../shared/services/permission.ts';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'admin only' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  try {
    const service = new AdminTaskService(env);
    const stats = await service.getStats();
    return new Response(JSON.stringify({ success: true, data: stats }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: e?.message || 'Server error' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
