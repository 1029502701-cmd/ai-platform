import { listModelsFromMemory, loadModelsFromBindings } from '../../../../shared/services/ai_model_manager.ts';

export const onRequestGet = async (context: any) => {
  const { request } = context;
  const isAdmin = request.headers.get('X-Admin') === 'true';
  if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), { status: 403 });

  await loadModelsFromBindings(context.env);
  const list = listModelsFromMemory();
  const publicList = list.map(m => ({ modelId: m.modelId, provider: m.provider, providerModelName: m.providerModelName, priority: m.priority, status: m.status }));
  return new Response(JSON.stringify({ success: true, data: publicList }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
