// ============================================
// AI Service (Migration Adapter)
// 保留原有接口，导入指向已迁移的模块
// ============================================

import { generateText, bootProviders } from './ai_provider_service';
import { getModelConfig, loadRegistryFromBindings } from './ai_provider_service';
import { renderPrompt } from './prompt_manager';
import { assembleContext } from './knowledge_manager';

export type AIRequest = {
  userId?: string;
  model?: string; // modelId
  promptKey?: string;
  variables?: Record<string, unknown>;
  knowledgeBaseId?: string;
  messages?: Array<{ role: string; content: string }>;
  options?: { maxTokens?: number; temperature?: number; topP?: number; timeoutMs?: number };
};

export type AIResponse = {
  content: string;
  model?: string;
  provider?: string;
  usage?: unknown;
  metadata?: unknown;
};

export async function initService(env?: unknown) {
  await bootProviders(env);
}

/** @deprecated 直接调用 packages/ai-core 中的 AI Queue Service */
export async function generateTextWithPipeline(env: unknown, req: AIRequest): Promise<AIResponse> {
  const modelId = req.model || (req.promptKey ? req.promptKey : undefined);
  const modelCfg = modelId ? await getModelConfig(modelId) : null;

  let promptStr: string | null = null;
  if (req.promptKey) {
    const rendered = await renderPrompt(req.promptKey, req.variables || {}, env as any);
    promptStr = rendered.prompt;
  }

  let contextStr: string | null = null;
  if (req.knowledgeBaseId || req.options?.maxTokens) {
    const q = (req.variables?.query as string | undefined) || (req.messages && req.messages.length ? req.messages.map(m => m.content).join('\n') : '');
    const ctx = await assembleContext(env, { query: q, baseKey: req.knowledgeBaseId, topK: 5, charLimit: 1500 });
    contextStr = ctx.context;
  }

  let finalPrompt = '';
  if (contextStr) finalPrompt += `Knowledge Context:\n${contextStr}\n\n`;
  if (promptStr) finalPrompt += promptStr;
  if (!finalPrompt && req.messages && req.messages.length) finalPrompt = req.messages.map(m => m.content).join('\n');
  if (!finalPrompt) finalPrompt = (req.variables as any)?.prompt || '';

  const providerReq = {
    prompt: finalPrompt,
    maxTokens: req.options?.maxTokens,
    temperature: req.options?.temperature,
    topP: req.options?.topP,
  };

  try {
    const resp = await generateText(modelId || 'mock-text-1', providerReq as any);
    const text = resp.choices && resp.choices.length
      ? resp.choices.map((c: any) => c.text).join('\n')
      : '';
    return { content: text, model: resp.model, provider: modelCfg?.provider || undefined, usage: resp.usage, metadata: resp.raw };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`AI_SERVICE_ERROR: ${message}`);
  }
}

/** @deprecated 直接调用 packages/ai-core 中的 AI Queue Service */
export async function generateChatWithPipeline(env: unknown, req: AIRequest): Promise<AIResponse> {
  const messages = req.messages || [];
  req.variables = req.variables || {};
  (req.variables as any).prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  return generateTextWithPipeline(env, req);
}
