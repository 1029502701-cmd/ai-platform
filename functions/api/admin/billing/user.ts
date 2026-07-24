import { hasRoleForRequest } from '../../../../shared/services/permission';
import { SubscriptionService } from '../../../../src/billing/subscription.service';

export const onRequestGet = async (context:any) => {
  const { env, request } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success:false, error:{ code:'FORBIDDEN', message:'admin only' } }), { status:403, headers:{ 'Content-Type':'application/json' } });
  const parts = context.params?.id ? [context.params.id] : [];
  const userId = parts[0] || (new URL(request.url)).searchParams.get('userId');
  if (!userId) return new Response(JSON.stringify({ success:false, error:{ code:'BAD_REQUEST', message:'userId required' } }), { status:400, headers:{ 'Content-Type':'application/json' } });

  const subSvc = new SubscriptionService(env.DB);

  const wallet = await env.DB.prepare('SELECT * FROM wallet WHERE user_id = ?').bind(userId).first();
  const subscription = await subSvc.getUserSubscription(userId);
  const usage = await env.DB.prepare('SELECT * FROM ai_usage WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(userId).all();

  return new Response(JSON.stringify({ success:true, data: { wallet, subscription, usage } }), { status:200, headers:{ 'Content-Type':'application/json' } });
};