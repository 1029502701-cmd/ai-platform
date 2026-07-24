import { createOrUpdateModelInDB, setModelStatusInDB } from '../../../../shared/services/ai_model_manager';

export const onRequestPut = async (context: any) => {
  const { request } = context;
  const isAdmin = request.headers.get('X-Admin') === 'true';
  if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), { status: 403 });
  const text = await request.text();
  const body = text ? JSON.parse(text) :{};
  if (!body.modelId) return new Response(JSON.stringify({ success: false, error: 'INVALID_PAYLOAD' }), { status: 400 });
  try {
    if (body.status) {
      await setModelStatusInDB(context.env, body.modelId, body.status);
    }
    if (body.provider || body.providerModelName || body.defaultParams) {
      await createOrUpdateModelInDB(context.env, { modelId: body.modelId, provider: body.provider || '', providerModelName: body.providerModelName || '', defaultParams: body.defaultParams, priority: body.priority, status: body.status });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
