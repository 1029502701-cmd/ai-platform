import { hasRoleForRequest } from '../../../../shared/services/permission';
import { BillingService } from '../../../../shared/services/billing_service';

export const onRequestPost = async (context:any) => {
  const { env, request } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success:false, error:{ code:'FORBIDDEN', message:'admin only' } }), { status:403, headers:{ 'Content-Type':'application/json' } });
  const body = await request.json().catch(()=>({}));
  const { userId, credits, reason } = body;
  if (!userId || typeof credits !== 'number') return new Response(JSON.stringify({ success:false, error:{ code:'BAD_REQUEST', message:'userId and credits required' } }), { status:400, headers:{ 'Content-Type':'application/json' } });

  const billing = new BillingService(env.DB);
  try {
    const w = await billing.refundCredits(userId, credits);
    const id = `alog_${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    await env.DB.prepare('INSERT INTO admin_operation_log (id, admin_id, action, target_id, detail, created_at) VALUES (?,?,?,?,?,?)').bind(id, 'system_admin', 'recharge', userId, JSON.stringify({ credits, reason }), now).run();
    return new Response(JSON.stringify({ success:true, data: w }), { status:200, headers:{ 'Content-Type':'application/json' } });
  } catch (e:any) {
    return new Response(JSON.stringify({ success:false, error:{ code:'ERR', message: e.message } }), { status:500, headers:{ 'Content-Type':'application/json' } });
  }
};
