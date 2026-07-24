import { generateTextWithPipeline, generateChatWithPipeline } from './ai_service';
import { BillingMiddleware } from '../../src/billing/billing.middleware';

export type CoreRequest = {
  requestId?: string;
  userId?: string;
  scenario?: string;
  aiRequest?: any; // AIRequest
};

export type CoreResponse = {
  requestId: string;
  ok: boolean;
  data?: any;
  error?: string;
  timings?: any;
};

function makeRequestId() {
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2,8);
}

export async function generateViaCore(env: any, coreReq: CoreRequest): Promise<CoreResponse> {
  const requestId = coreReq.requestId || makeRequestId();
  const start = Date.now();
  try {
    // determine model via scenario or aiRequest.model
    let modelId = coreReq.aiRequest?.model;
    if (!modelId && coreReq.scenario) {
      // read scenario mapping from DB
      try {
        const row = await env.DB.prepare('SELECT default_model_id, default_prompt_key, default_kb_key FROM ai_scenarios WHERE scenario_key = ?').get(coreReq.scenario);
        if (row) {
          modelId = modelId || row.default_model_id;
          coreReq.aiRequest = coreReq.aiRequest || {};
          coreReq.aiRequest.promptKey = coreReq.aiRequest.promptKey || row.default_prompt_key;
          coreReq.aiRequest.knowledgeBaseId = coreReq.aiRequest.knowledgeBaseId || row.default_kb_key;
        }
      } catch (e) {
        // ignore and proceed
      }
    }

    // Attach userId to aiRequest
    coreReq.aiRequest = coreReq.aiRequest || {};
    if (coreReq.userId) coreReq.aiRequest.userId = coreReq.userId;

    // Billing middleware: run before request
    const billing = new BillingMiddleware(env.DB);
    let billingContext: any = null;
    try {
      const svcName = coreReq.aiRequest.service || 'ai';
      const modelName = coreReq.aiRequest.model || modelId || 'default';
      billingContext = await billing.beforeAIRequest(coreReq.userId || 'anonymous', svcName, modelName);
    } catch (bErr: any) {
      // insufficient credits or billing error -> return error response without calling AI Service
      const duration = Date.now() - start;
      return { requestId, ok: false, error: bErr.message || 'BILLING_ERROR', timings: { duration } };
    }

    // Choose chat or text based on presence of messages
    let resp;
    try {
      if (coreReq.aiRequest && coreReq.aiRequest.messages && coreReq.aiRequest.messages.length) {
        resp = await generateChatWithPipeline(env, coreReq.aiRequest);
      } else {
        resp = await generateTextWithPipeline(env, coreReq.aiRequest);
      }
    } catch (e) {
      // On AI error, refund
      try { if (billingContext) await billing.onFailure(coreReq.userId || 'anonymous', billingContext.credits); } catch (_) {}
      const duration = Date.now() - start;
      return { requestId, ok: false, error: (e as any)?.message || 'AI_CORE_ERROR', timings: { duration } };
    }

    // On success: log usage
    try {
      const inputTokens = resp?.usage?.prompt_tokens ?? 0;
      const outputTokens = resp?.usage?.completion_tokens ?? 0;
      await billing.afterAIResponse(coreReq.userId || 'anonymous', coreReq.aiRequest.service || 'ai', coreReq.aiRequest.model || modelId || 'default', inputTokens, outputTokens, billingContext);
    } catch (logErr) {
      // Log and continue
      console.error('[AI Core] billing logging error', logErr);
    }

    const duration = Date.now() - start;
    return { requestId, ok: true, data: resp, timings: { duration } };
  } catch (e: any) {
    const duration = Date.now() - start;
    return { requestId, ok: false, error: e.message || 'AI_CORE_ERROR', timings: { duration } };
  }
}
