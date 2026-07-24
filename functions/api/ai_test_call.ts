import { generateText, registerProvider } from '../../shared/services/ai_provider_service';
import { seedExample } from '../../shared/services/ai_provider_registry';
import { MockProvider } from '../../shared/services/ai_provider_adapters_mock';

export const onRequestGet = async (context: any) => {
  const { request } = context;
  await seedExample();
  registerProvider('mock', MockProvider);

  const url = new URL(request.url);
  const modelId = url.searchParams.get('model') || 'mock-text-1';
  const prompt = url.searchParams.get('prompt') || 'Hello world';
  try {
    const resp = await generateText(modelId, { prompt });
    return new Response(JSON.stringify({ success: true, data: resp }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'AI_ERROR', message: e.message } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
