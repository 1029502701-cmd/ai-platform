import { QueueMaintenanceService } from '../../../../../shared/services/queue_maintenance.ts';
import { hasRoleForRequest } from '../../../../../shared/services/permission.ts';

export const onRequestGet = async (context: any) => {
  const { env, request } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'admin only' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  const s = new QueueMaintenanceService(env);
  const stats = await s.getHealth();
  return new Response(JSON.stringify({ success: true, data: stats }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
