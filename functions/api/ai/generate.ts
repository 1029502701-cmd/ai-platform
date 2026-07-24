import { generateViaCore } from '../../../shared/services/ai_core';

export const onRequestPost = async (context: any) => {
  const { request } = context;
  const text = await request.text();
  const body = text ? JSON.parse(text) :{};
  try {
    const res = await generateViaCore(context.env, { aiRequest: body });
    if (!res.ok) return new Response(JSON.stringify({ success: false, error: res.error }), { status: 500 });
    return new Response(JSON.stringify({ success: true, data: res.data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
