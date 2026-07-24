import { generateTextWithPipeline, generateChatWithPipeline } from './ai_service';
import { BillingMiddleware } from './billing_middleware';
import { initAIService, registerProvider } from './ai_provider_service';
import { MockProvider } from './ai_provider_adapters_mock';

export type CoreRequest = {
  requestId?: string;
  userId?: string;
  scenario?: string;
  aiRequest?: any;
};

export type CoreResponse = {
  requestId: string;
  ok: boolean;
  data?: any;
  error?: string;
  timings?: any;
};

let _registryInitialized = false;

function makeRequestId() {
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

async function ensureRegistry(env: any) {
  if (_registryInitialized) return;
  try {
    await initAIService(env);
    // Register mock provider for local/dev testing
    registerProvider('mock', MockProvider);
    console.log('[AI Core] registry and mock provider initialized');
  } catch (err: any) {
    console.error('[AI Core] init failed:', err.message);
  }
  _registryInitialized = true;
}

export async function generateViaCore(env: any, coreReq: CoreRequest): Promise<CoreResponse> {
  const requestId = coreReq.requestId || makeRequestId();
  const start = Date.now();
  try {
    await ensureRegistry(env);

    let modelId = coreReq.aiRequest?.model;
    if (!modelId && coreReq.scenario) {
      try {
        const row = await env.DB.prepare('SELECT default_model_id FROM ai_scenarios WHERE scenario_key = ?').get(coreReq.scenario);
        if (row) modelId = row.default_model_id;
      } catch (e) {}
    }

    coreReq.aiRequest = coreReq.aiRequest || {};
    if (coreReq.userId) coreReq.aiRequest.userId = coreReq.userId;

    const billing = new BillingMiddleware(env.DB);
    let billingContext: any = null;
    try {
      billingContext = await billing.beforeAIRequest(
        coreReq.userId || 'anonymous',
        coreReq.aiRequest.service || 'ai',
        coreReq.aiRequest.model || modelId || 'default'
      );
    } catch (bErr: any) {
      return { requestId, ok: false, error: bErr.message || 'BILLING_ERROR', timings: { duration: Date.now() - start } };
    }

    let resp;
    try {
      if (coreReq.aiRequest.messages?.length) {
        resp = await generateChatWithPipeline(env, coreReq.aiRequest);
      } else {
        resp = await generateTextWithPipeline(env, coreReq.aiRequest);
      }
    } catch (e: any) {
      try {
        if (billingContext && billingContext.credits > 0) await billing.onFailure(coreReq.userId || 'anonymous', billingContext.credits);
      } catch (_) {}
      return { requestId, ok: false, error: e.message || 'AI_CORE_ERROR', timings: { duration: Date.now() - start } };
    }

    if (billingContext && billingContext.credits > 0) {
      try {
        const inputTokens = resp?.usage?.prompt_tokens ?? 0;
        const outputTokens = resp?.usage?.completion_tokens ?? 0;
        await billing.afterAIResponse(
          coreReq.userId || 'anonymous',
          coreReq.aiRequest.service || 'ai',
          coreReq.aiRequest.model || modelId || 'default',
          inputTokens, outputTokens, billingContext
        );
      } catch (logErr) {
        console.error('[AI Core] billing log error', logErr);
      }
    }

    return { requestId, ok: true, data: resp, timings: { duration: Date.now() - start } };
  } catch (e: any) {
    console.error('[AI Core] unexpected error:', e.message);
    return { requestId, ok: false, error: e.message || 'AI_CORE_ERROR', timings: { duration: Date.now() - start } };
  }
}

