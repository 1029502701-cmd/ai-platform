import { generateText, registerProvider } from '../../shared/services/ai_provider_service.ts';
import { seedExample } from '../../shared/services/ai_provider_registry.ts';
import { MockProvider } from '../../shared/services/ai_provider_adapters_mock.ts';

export const onRequestGet = async (context: any) => {
  const { request } = context;
  await seedExample();
  // register mock provider instance
  // register mock provider
  registerProvider('mock', MockProvider);
  // if OPENAI adapter exists, import and register it (dynamic import to avoid bundling/runtime issues)
  try {
    const mod = await import('../../shared/services/ai_provider_adapters_openai');
    if (mod && mod.OpenAIProvider) {
      registerProvider('openai', new mod.OpenAIProvider(context.env || undefined));
    }
  } catch (e) {
    // ignore import errors in envs without OpenAI adapter
  }

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
