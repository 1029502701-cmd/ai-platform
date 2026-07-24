import { generateText, initAIService } from './ai_provider_service';
import { getModelConfig } from './ai_provider_registry';
import { renderPrompt } from './prompt_manager';
import { assembleContext } from './knowledge_manager';

export type AIRequest = {
  userId?: string;
  model?: string; // modelId
  promptKey?: string;
  variables?: Record<string, any>;
  knowledgeBaseId?: string;
  messages?: Array<{ role: string; content: string }>;
  options?: { maxTokens?: number; temperature?: number; topP?: number; timeoutMs?: number };
};

export type AIResponse = {
  content: string;
  model?: string;
  provider?: string;
  usage?: any;
  metadata?: any;
};

// Initialize service (load registry)
export async function initService(env?: any) {
  await initAIService(env);
}

export async function generateTextWithPipeline(env: any, req: AIRequest): Promise<AIResponse> {
  // 1. Resolve model config
  const modelId = req.model || (req.promptKey ? req.promptKey : undefined);
  const modelCfg = modelId ? await getModelConfig(modelId) : null;

  // 2. Load prompt if provided
  let promptStr: string | null = null;
  if (req.promptKey) {
    // render prompt with variables and possibly knowledge
    const rendered = await renderPrompt(req.promptKey, req.variables || {}, env);
    promptStr = rendered.prompt;
  }

  // 3. Load knowledge context if requested
  let contextStr: string | null = null;
  if (req.knowledgeBaseId || req.options?.maxTokens) {
    // use query from variables or messages
    const q = req.variables?.query || (req.messages && req.messages.length ? req.messages.map(m=>m.content).join('\n') : '');
    const ctx = await assembleContext(env, { query: q, baseKey: req.knowledgeBaseId, topK: 5, charLimit: 1500 });
    contextStr = ctx.context;
  }

  // 4. Compose final prompt
  let finalPrompt = '';
  if (contextStr) finalPrompt += `Knowledge Context:\n${contextStr}\n\n`;
  if (promptStr) finalPrompt += promptStr;
  if (!finalPrompt && req.messages && req.messages.length) finalPrompt = req.messages.map(m=>m.content).join('\n');
  if (!finalPrompt) finalPrompt = req.variables?.prompt || '';

  // 5. Build provider request
  const providerReq = {
    prompt: finalPrompt,
    maxTokens: req.options?.maxTokens,
    temperature: req.options?.temperature,
    topP: req.options?.topP,
  };

  // 6. Call provider via generateText
  try {
    const resp = await generateText(modelId || 'mock-text-1', providerReq as any);
    const text = resp.choices && resp.choices.length ? resp.choices.map(c=>c.text).join('\n') : '';
    return { content: text, model: resp.model, provider: modelCfg?.provider || undefined, usage: resp.usage, metadata: resp.raw };
  } catch (e: any) {
    // basic error handling and rethrow
    throw new Error(`AI_SERVICE_ERROR: ${e.message}`);
  }
}

export async function generateChatWithPipeline(env: any, req: AIRequest): Promise<AIResponse> {
  // For now, map messages to a prompt and call generateTextWithPipeline
  const messages = req.messages || [];
  req.variables = req.variables || {};
  req.variables.prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  return generateTextWithPipeline(env, req);
}
