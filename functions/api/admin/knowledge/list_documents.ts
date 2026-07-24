import { listDocuments } from '../../../../shared/services/knowledge_manager';
import { hasRoleForRequest } from '../../../../shared/services/permission';

export const onRequestGet = async (context: any) => {
  const { request } = context;
  const url = new URL(request.url);
  const baseKey = url.searchParams.get('baseKey');
  if (!baseKey) return new Response(JSON.stringify({ success: false, error: 'MISSING_BASE' }), { status: 400 });
  const isAdmin = await hasRoleForRequest('admin', { env: context.env, request }).catch(() => false);
  if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), { status: 403 });
  try {
    const docs = await listDocuments(context.env, baseKey);
    return new Response(JSON.stringify({ success: true, data: docs }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
