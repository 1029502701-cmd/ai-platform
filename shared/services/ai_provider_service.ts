import { getModelConfig, loadRegistryFromBindings } from './ai_provider_registry';
import type { TextGenerationRequest, TextGenerationResponse } from './ai_provider_types';

// Simple AI Service that uses registry and providers map
const providers: Record<string, any> = {};

export function registerProvider(id: string, providerImpl: any) {
  providers[id] = providerImpl;
}

export async function initAIService(env?: any) {
  // load registry from env bindings if provided
  await loadRegistryFromBindings(env);
}

export async function generateText(modelId: string, request: TextGenerationRequest): Promise<TextGenerationResponse> {
  const cfg = await getModelConfig(modelId);
  if (!cfg || cfg.status !== 'active') throw new Error('MODEL_NOT_FOUND_OR_DISABLED');
  const provider = providers[cfg.provider];
  if (!provider) throw new Error('PROVIDER_NOT_REGISTERED');

  // apply default params
  const mergedReq = { ...cfg.defaultParams, ...request } as TextGenerationRequest;

  // Support provider-level timeout/retry if provider exposes them; provider.generateText should implement timeout/retry
  return provider.generateText(mergedReq);
}
