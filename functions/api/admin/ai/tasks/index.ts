import { AdminTaskService } from '../../../../../shared/services/admin_task_service.ts';
import { hasRoleForRequest } from '../../../../../shared/services/permission.ts';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  // Auth: admin only
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'admin only' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const taskType = url.searchParams.get('taskType') || undefined;
  const userId = url.searchParams.get('userId') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const service = new AdminTaskService(env);
  const tasks = await service.listTasks({ status, taskType, userId }, limit);
  return new Response(JSON.stringify({ success: true, data: tasks }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
