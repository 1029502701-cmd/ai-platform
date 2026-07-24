import { searchKnowledge } from '../../../shared/services/knowledge_manager';

export const onRequestPost = async (context: any) => {
  const { request } = context;
  const text = await request.text();
  const body = text ? JSON.parse(text) :{};
  if (!body.query) return new Response(JSON.stringify({ success: false, error: 'MISSING_QUERY' }), { status: 400 });
  try {
    const res = await searchKnowledge(context.env, { query: body.query, baseKey: body.baseKey, topK: body.topK });
    return new Response(JSON.stringify({ success: true, data: res }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
