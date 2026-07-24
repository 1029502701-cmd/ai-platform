import { hasRoleForRequest } from '../../../../shared/services/permission';
import { AnalyticsService } from '../../../../src/analytics/analytics.service';

export const onRequestGet = async (context:any) => {
  const { env, request } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success:false, error:{ code:'FORBIDDEN', message:'admin only' } }), { status:403, headers:{ 'Content-Type':'application/json' } });

  const analytics = new AnalyticsService(env.DB);

  const total = await analytics.getCostReport();
  const today = await analytics.repo.getTodayCounts();

  // users and totalCredits from wallet table
  const row = await env.DB.prepare('SELECT COUNT(*) as users, SUM(credits) as totalCredits FROM wallet').first();

  const data = {
    users: Number(row?.users || 0),
    totalCredits: Number(row?.totalCredits || 0),
    todayUsage: today.todayRequests,
    todayCost: today.todayCost,
    totalCost: total.totalCost
  };
  return new Response(JSON.stringify({ success:true, data }), { status:200, headers:{ 'Content-Type':'application/json' } });
};