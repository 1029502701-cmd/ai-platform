import { hasRoleForRequest } from '../../../../shared/services/permission.ts';

export const onRequestGet = async (context:any) => {
  const { env, request } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success:false, error:{ code:'FORBIDDEN', message:'admin only' } }), { status:403, headers:{ 'Content-Type':'application/json' } });
  const rows = await env.DB.prepare('SELECT * FROM ai_pricing ORDER BY created_at DESC').all();
  return new Response(JSON.stringify({ success:true, data: rows }), { status:200, headers:{ 'Content-Type':'application/json' } });
};

export const onRequestPost = async (context:any) => {
  const { env, request } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success:false, error:{ code:'FORBIDDEN', message:'admin only' } }), { status:403, headers:{ 'Content-Type':'application/json' } });
    const text = await request.text();
  const body = JSON.parse(text ||"{}");
  const { id, service, model, credits, cost_usd, enabled } = body;
  if (!service || !model || typeof cost_usd !== 'number') return new Response(JSON.stringify({ success:false, error:{ code:'BAD_REQUEST', message:'service, model, cost_usd required' } }), { status:400, headers:{ 'Content-Type':'application/json' } });
  const now = new Date().toISOString();
  if (id) {
    await env.DB.prepare('UPDATE ai_pricing SET service = ?, model = ?, credits = ?, cost_usd = ?, enabled = ?, created_at = ? WHERE id = ?').bind(service, model, credits||1, cost_usd, enabled?1:0, now, id).run();
    return new Response(JSON.stringify({ success:true }), { status:200, headers:{ 'Content-Type':'application/json' } });
  }
  const nid = `price_${Date.now().toString(36)}`;
  await env.DB.prepare('INSERT INTO ai_pricing (id, service, model, credits, cost_usd, enabled, created_at) VALUES (?,?,?,?,?,?,?)').bind(nid, service, model, credits||1, cost_usd, enabled?1:1, now).run();
  return new Response(JSON.stringify({ success:true }), { status:200, headers:{ 'Content-Type':'application/json' } });
};
