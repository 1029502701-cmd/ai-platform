import { createBaseInDB } from '../../../../shared/services/knowledge_manager';
import { hasRoleForRequest } from '../../../../shared/services/permission';

export const onRequestPost = async (context: any) => {
  const { request } = context;
  const isAdmin = await hasRoleForRequest('admin', { env: context.env, request }).catch(() => false);
  if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), { status: 403 });
  const body = await request.json();
  if (!body.key || !body.name) return new Response(JSON.stringify({ success: false, error: 'INVALID_PAYLOAD' }), { status: 400 });
  try {
    await createBaseInDB(context.env, { key: body.key, name: body.name, description: body.description, type: body.type, owner_id: body.owner_id, created_by: body.created_by });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
