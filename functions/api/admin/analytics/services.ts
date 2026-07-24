import { AnalyticsService } from '../../../../src/analytics/analytics.service';
import { hasRoleForRequest } from '../../../../shared/services/permission';

export const onRequestGet = async (context: any) => {
  const { env, request } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'admin only' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  const svc = new AnalyticsService(env.DB);
  const data = await svc.getServiceRanking();
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};