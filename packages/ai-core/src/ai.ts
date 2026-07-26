// ============================================
// AI Core - Unified Interface
// Entry point: ai.generate() for text, ai.chat() for chat
// ============================================

import type {
  AITextRequest,
  AIChatRequest,
  AIResult,
  ModelConfig,
} from './types/index';
import { listActiveModels, getModelConfig, loadRegistryFromDB } from './model-registry';
import { routeToProvider, routeChatToProvider, bootProviders } from './provider-router';
import { getScenario, resolveDefaultModel, loadScenariosFromDB } from './scenarios/index';

let isInitialized = false;
let modelConfigs: Map<string, ModelConfig> = new Map();

async function ensureInit(env?: any): Promise<void> {
  if (isInitialized) return;

  // Load models from DB/KV
  await loadRegistryFromDB(env);
  // Load scenarios
  await loadScenariosFromDB(env);
  // Register providers
  await bootProviders(env);

  // Cache active models
  const active = listActiveModels();
  modelConfigs = new Map(active.map(m => [m.modelId, m]));

  isInitialized = true;
}

/**
 * Generate text via unified interface.
 *
 * Usage:
 *   const result = await ai.generate({ prompt: 'Hello', scenario: 'chat_default' });
 *   if (result.ok) console.log(result.content);
 */
export async function generateText(req: AITextRequest, env?: any): Promise<AIResult> {
  const start = Date.now();
  const requestId = req.requestId || eq__;

  try {
    await ensureInit(env);

    // Resolve model
    let modelId: string | undefined;
    const scenario = req.scenario ? getScenario(req.scenario) : null;

    if (scenario && !req.model) {
      modelId = scenario.defaultModelId;
    } else {
      modelId = req.model;
    }

    if (!modelId) {
      return makeError(requestId, start, 'NO_MODEL_SPECIFIED', 'Either provide a model ID or configure a scenario');
    }

    const modelCfg = modelConfigs.get(modelId);
    if (!modelCfg) {
      return makeError(requestId, start, 'MODEL_NOT_FOUND', Model not found or disabled: );
    }

    if (modelCfg.status !== 'active') {
      return makeError(requestId, start, 'MODEL_DISABLED', Model is disabled: );
    }

    // Call provider
    const resp = await routeToProvider(modelCfg, {
      prompt: req.prompt,
      maxTokens: req.options?.maxTokens,
      temperature: req.options?.temperature,
      topP: req.options?.topP,
      stop: req.options?.stop,
      metadata: { ...req.options, scenario: req.scenario, userId: req.userId },
    });

    return {
      ok: true,
      content: resp.choices[0]?.text ?? '',
      model: resp.model,
      provider: resp.provider,
      usage: resp.usage ? {
        promptTokens: resp.usage.promptTokens,
        completionTokens: resp.usage.completionTokens,
        totalTokens: resp.usage.totalTokens,
        model: resp.model,
        provider: resp.provider,
      } : undefined,
      requestId,
      timings: { duration: Date.now() - start },
      meta: { scenario: req.scenario },
    };
  } catch (e: any) {
    return makeError(requestId, start, 'GENERATION_ERROR', e.message || 'Unknown error during text generation');
  }
}

/**
 * Generate a chat response (multi-turn conversation).
 *
 * Usage:
 *   const result = await ai.chat({ messages: [{role:'user',content:'Hi'}] });
 */
export async function generateChat(req: AIChatRequest, env?: any): Promise<AIResult> {
  const start = Date.now();
  const requestId = req.requestId || eq__;

  try {
    await ensureInit(env);

    // Resolve model
    let modelId: string | undefined;
    if (req.scenario) {
      const scenario = getScenario(req.scenario);
      modelId = scenario?.defaultModelId;
    }
    modelId = req.model || modelId;

    if (!modelId) {
      return makeError(requestId, start, 'NO_MODEL_SPECIFIED', 'Either provide a model ID or configure a scenario');
    }

    const modelCfg = modelConfigs.get(modelId);
    if (!modelCfg) {
      return makeError(requestId, start, 'MODEL_NOT_FOUND', Model not found or disabled: );
    }

    if (modelCfg.status !== 'active') {
      return makeError(requestId, start, 'MODEL_DISABLED', Model is disabled: );
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }
    messages.push(...req.messages.map(m => ({ role: m.role, content: m.content })));

    // Call provider chat endpoint
    const resp = await routeChatToProvider(modelCfg, {
      messages,
      model: req.model,
      maxTokens: req.options?.maxTokens,
      temperature: req.options?.temperature,
      topP: req.options?.topP,
      stop: req.options?.stop,
      metadata: { ...req.options, scenario: req.scenario, userId: req.userId },
    });

    const firstChoice = resp.choices[0];
    return {
      ok: true,
      content: firstChoice?.message?.content ?? '',
      model: resp.model,
      provider: resp.provider,
      usage: resp.usage ? {
        promptTokens: resp.usage.promptTokens,
        completionTokens: resp.usage.completionTokens,
        totalTokens: resp.usage.totalTokens,
        model: resp.model,
        provider: resp.provider,
      } : undefined,
      requestId,
      timings: { duration: Date.now() - start },
      meta: { scenario: req.scenario },
    };
  } catch (e: any) {
    return makeError(requestId, start, 'CHAT_ERROR', e.message || 'Unknown error during chat generation');
  }
}

function makeError(requestId: string, start: number, code: string, message: string) {
  return {
    ok: false as const,
    error: message,
    code,
    requestId,
    timings: { duration: Date.now() - start },
    details: message,
  };
}

// Default export
export const ai = {
  generate: generateText,
  chat: generateChat,
};

export default ai;

export { generateText as generate, generateChat as chat };
