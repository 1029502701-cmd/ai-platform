import { getModelConfig, loadRegistryFromBindings } from './ai_provider_registry';
import type { TextGenerationRequest, TextGenerationResponse } from './ai_provider_types';

const providers: Record<string, any> = {};

export function registerProvider(id: string, providerImpl: any) {
  providers[id] = providerImpl;
}

export async function initAIService(env?: any) {
  await loadRegistryFromBindings(env);
}

export async function generateText(modelId: string, request: TextGenerationRequest): Promise<TextGenerationResponse> {
  const cfg = await getModelConfig(modelId);
  if (!cfg || cfg.status !== 'active') throw new Error('MODEL_NOT_FOUND_OR_DISABLED');
  const providerName = cfg.provider;
  const provider = providers[providerName];
  if (!provider) throw new Error('PROVIDER_NOT_REGISTERED for ' + providerName);
  const mergedReq = { ...cfg.defaultParams, ...request } as TextGenerationRequest;
  return provider.generateText(mergedReq);
}
