import { publishVersionInDB } from '../../../../shared/services/prompt_manager';
import { hasRoleForRequest } from '../../../../shared/services/permission';

export const onRequestPost = async (context: any) => {
  const { request } = context;
  const text = await request.text();
  const body = text ? JSON.parse(text) :{};
  if (!body.versionId) return new Response(JSON.stringify({ success: false, error: 'INVALID_PAYLOAD' }), { status: 400 });
  const isAdmin = await hasRoleForRequest('admin', { env: context.env, request }).catch(() => false);
  if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), { status: 403 });
  try {
    await publishVersionInDB(context.env, body.versionId);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
