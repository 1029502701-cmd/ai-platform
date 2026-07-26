import { hasRoleForRequest } from '../../../../shared/services/permission.ts';
import { PlanRepository } from '../../../../shared/services/plan.repository.ts';

export const onRequestGet = async (context:any) => {
  const { env, request } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success:false, error:{ code:'FORBIDDEN', message:'admin only' } }), { status:403, headers:{ 'Content-Type':'application/json' } });
  const repo = new PlanRepository(env.DB);
  const rows = await repo.listPlans();
  return new Response(JSON.stringify({ success:true, data: rows }), { status:200, headers:{ 'Content-Type':'application/json' } });
};

export const onRequestPost = async (context:any) => {
  const { env, request } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success:false, error:{ code:'FORBIDDEN', message:'admin only' } }), { status:403, headers:{ 'Content-Type':'application/json' } });
  const body = await request.json().catch(()=>({}));
  const { id, name, price, credits, duration_days } = body;
  const repo = new PlanRepository(env.DB);
  if (id) {
    await repo.updatePlan(id, { name, price, credits, duration_days });
    return new Response(JSON.stringify({ success:true }), { status:200, headers:{ 'Content-Type':'application/json' } });
  }
  const nid = `plan_${Date.now().toString(36)}`;
  await repo.createPlan({ id: nid, name, price, credits, duration_days });
  return new Response(JSON.stringify({ success:true }), { status:200, headers:{ 'Content-Type':'application/json' } });
};
