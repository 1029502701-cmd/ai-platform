// Provider Router
// Routes requests to the correct provider based on model configuration.

import type {
  TextGenerationRequest,
  TextGenerationResponse,
  ChatGenerationRequest,
  ChatGenerationResponse,
  ModelConfig,
  ProviderId,
} from './types/index';
import { BaseProvider } from './providers/base-provider';

const providers: Map<ProviderId, BaseProvider> = new Map();

export function registerProvider(id: ProviderId, instance: BaseProvider): void {
  providers.set(id, instance);
}

export function getProvider(id: ProviderId): BaseProvider | null {
  return providers.get(id) || null;
}

export function listRegisteredProviders(): ProviderId[] {
  return Array.from(providers.keys());
}

/**
 * Resolve which provider to use and forward the request.
 */
export async function routeToProvider(
  modelConfig: ModelConfig,
  req: TextGenerationRequest
): Promise<TextGenerationResponse> {
  const provider = providers.get(modelConfig.provider);
  if (!provider) throw new Error(`PROVIDER_NOT_REGISTERED: ${modelConfig.provider}`);

  // Merge default params with request
  const merged: TextGenerationRequest = {
    ...modelConfig.defaultParams,
    ...req,
    prompt: req.prompt, // always keep prompt explicit
  };
  return provider.generateText(merged);
}

/**
 * Route a chat request to the appropriate provider.
 */
export async function routeChatToProvider(
  modelConfig: ModelConfig,
  req: ChatGenerationRequest
): Promise<ChatGenerationResponse> {
  const provider = providers.get(modelConfig.provider);
  if (!provider) throw new Error(`PROVIDER_NOT_REGISTERED: ${modelConfig.provider}`);

  return provider.generateChat(req);
}

/**
 * Load all providers based on registry (called once at bootstrap).
 */
export async function bootProviders(env?: any): Promise<void> {
  await import('./providers/mock-provider').then(async mod => {
    registerProvider('mock', new mod.MockProvider(env));
  }).catch(() => {});

  await import('./providers/openai-provider').then(async mod => {
    try {
      const hasKey = env?.OPENAI_API_KEY && typeof env.OPENAI_API_KEY === 'string' && env.OPENAI_API_KEY.length > 0;
      if (hasKey) registerProvider('openai', new mod.OpenAIProvider(env));
    } catch (_) {}
  }).catch(() => {});

  await import('./providers/deepseek-provider').then(async mod => {
    try {
      const hasKey = env?.DEEPSEEK_API_KEY && typeof env.DEEPSEEK_API_KEY === 'string' && env.DEEPSEEK_API_KEY.length > 0;
      if (hasKey) registerProvider('deepseek', new mod.DeepSeekProvider(env));
    } catch (_) {}
  }).catch(() => {});
}
