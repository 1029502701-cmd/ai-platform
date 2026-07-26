import { hasRoleForRequest } from '../../../../../../../shared/services/permission.ts';
import { BeautyRepository } from '../../../../../../../database/beauty_repository';

export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;
  const ok = await hasRoleForRequest('admin', { env, request });
  if (!ok) return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'admin only' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  try {
    const id = params?.id || new URL(request.url).pathname.split('/').pop();
    if (!id) return new Response(JSON.stringify({ success: false, error: { code: 'INVALID_PARAMS', message: 'id required' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const repo = new BeautyRepository(env.DB);
    const profile = await repo.getProfile(id);
    const history = await repo.getHistory(id, { limit: 200 });
    const reports = await repo.listUserReports(id);
    return new Response(JSON.stringify({ success: true, data: { profile, history, reports } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'SERVER_ERROR', message: e?.message || 'Server error' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
