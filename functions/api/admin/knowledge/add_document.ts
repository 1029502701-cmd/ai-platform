import { addDocumentInDB } from '../../../../shared/services/knowledge_manager';
import { hasRoleForRequest } from '../../../../shared/services/permission';

export const onRequestPost = async (context: any) => {
  const { request } = context;
  const isAdmin = await hasRoleForRequest('admin', { env: context.env, request }).catch(() => false);
  if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), { status: 403 });
  const text = await request.text();
  const body = text ? JSON.parse(text) :{};
  if (!body.baseKey || (!body.content && !body.content_location && !body.title)) return new Response(JSON.stringify({ success: false, error: 'INVALID_PAYLOAD' }), { status: 400 });
  try {
    const docId = await addDocumentInDB(context.env, { baseKey: body.baseKey, doc_key: body.doc_key, title: body.title, content: body.content, content_location: body.content_location, metadata: body.metadata, created_by: body.created_by, status: body.status });
    return new Response(JSON.stringify({ success: true, docId }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
