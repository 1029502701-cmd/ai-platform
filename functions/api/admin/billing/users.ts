import { hasRoleForRequest } from '../../../../shared/services/permission';

export const onRequestGet = async (context:any) => {
  const { env, request } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success:false, error:{ code:'FORBIDDEN', message:'admin only' } }), { status:403, headers:{ 'Content-Type':'application/json' } });

  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') || '1');
  const perPage = Number(url.searchParams.get('perPage') || '20');
  const offset = (page-1)*perPage;

  const rows = await env.DB.prepare('SELECT id as userId, credits, total_used as totalUsed, created_at as createdAt FROM wallet ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(perPage, offset).all();
  return new Response(JSON.stringify({ success:true, data: rows }), { status:200, headers:{ 'Content-Type':'application/json' } });
};