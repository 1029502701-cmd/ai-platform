import { renderPrompt } from '../../../shared/services/prompt_manager';

export const onRequestPost = async (context: any) => {
  const { request } = context;
  const body = await request.json();
  if (!body.key) return new Response(JSON.stringify({ success: false, error: 'MISSING_KEY' }), { status: 400 });
  try {
    const res = await renderPrompt(body.key, body.variables || {}, context.env);
    return new Response(JSON.stringify({ success: true, data: res }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
};
