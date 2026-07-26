import { generateTextWithPipeline, generateChatWithPipeline } from './ai_service';
import { BillingMiddleware } from './billing_middleware';
import { initAIService, registerProvider } from './ai_provider_service';
import { MockProvider } from './ai_provider_adapters_mock';
import { checkAndConsumeLimit } from '../auth/usage';

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

async function ensureRegistry(env: any) {
  try {
    await initAIService(env);
    registerProvider('mock', MockProvider);
    try {
      const mod = await import('./ai_provider_adapters_openai');
      if (mod && mod.OpenAIProvider) {
        registerProvider('openai', new mod.OpenAIProvider(env));
      }
    } catch (e) {}
    try {
      const mod = await import('./ai_provider_adapters_deepseek');
      if (mod && mod.DeepSeekProvider) {
        registerProvider('deepseek', new mod.DeepSeekProvider(env));
      }
    } catch (e) {}
  } catch (err: any) {
    console.error('[AI Core] init failed:', err.message);
  }
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

    // Enforce per-user daily free usage limits (for guest users)
    if (coreReq.userId) {
      try {
        const limitRes = await checkAndConsumeLimit(env.DB, coreReq.userId);
        if (!limitRes.ok) {
          return { requestId, ok: false, error: limitRes.error || 'DAILY_LIMIT_EXCEEDED', timings: { duration: Date.now() - start } };
        }
      } catch (e: any) {
        return { requestId, ok: false, error: e.message || 'USAGE_CHECK_FAILED', timings: { duration: Date.now() - start } };
      }
    }

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

function makeRequestId() {
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}
