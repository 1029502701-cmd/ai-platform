import { assembleContext } from '../../../shared/services/knowledge_manager';

export const onRequestPost = async (context: any) => {
  const { request } = context;
  const body = await request.json();
  if (!body.query) return new Response(JSON.stringify({ success: false, error: 'MISSING_QUERY' }), { status: 400 });
  try {
    const res = await assembleContext(context.env, { query: body.query, baseKey: body.baseKey, topK: body.topK, charLimit: body.charLimit });
    return new Response(JSON.stringify({ success: true, data: res }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
