import { generateTextWithPipeline } from '../../../shared/services/ai_service';

export const onRequestPost = async (context: any) => {
  const { request } = context;
  const body = await request.json();
  try {
    const res = await generateTextWithPipeline(context.env, body);
    return new Response(JSON.stringify({ success: true, data: res }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
