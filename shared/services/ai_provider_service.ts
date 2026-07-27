// ============================================
// AI Provider Service (Migration Adapter)
// 代理到 packages/ai-core，保持向后兼容
// ============================================

// Re-export from ai-core package
import { getModelConfig } from '../../packages/ai-core/src/model-registry.ts';
import { seedExampleModel } from '../../packages/ai-core/src/model-registry.ts';
export { registerProvider, bootProviders } from '../../packages/ai-core/src/provider-router.ts';
export { getModelConfig, loadRegistryFromDB as loadRegistryFromBindings, listActiveModels } from '../../packages/ai-core/src/model-registry.ts';

// MockProvider alias (from ai-core)
export { MockProvider } from '../../packages/ai-core/src/providers/mock-provider.ts';

/** Legacy function name alias */
export async function seedExample(env?: any): Promise<void> {
  await seedExampleModel(env);
}

import type { TextGenerationRequest, TextGenerationResponse } from '../../packages/ai-core/src/types/index.ts';

export async function generateText(
  modelId: string,
  request: TextGenerationRequest,
): Promise<TextGenerationResponse> {
  const cfg = await getModelConfig(modelId);
  if (!cfg || cfg.status !== 'active') {
    throw new Error('MODEL_NOT_FOUND_OR_DISABLED');
  }
  // Dynamic import for flexibility
  const providerModule = await import(`../../packages/ai-core/src/providers/${cfg.provider}-provider.ts`);
  // Find the provider class (e.g., OpenAIProvider -> openai-provider)
  const providerName = cfg.provider.charAt(0).toUpperCase() + cfg.provider.slice(1);
  const ProviderClass = providerModule[`${providerName}Provider`] as any;
  if (!ProviderClass) throw new Error(`PROVIDER_${String(cfg.provider).toUpperCase()}_NOT_IMPLEMENTED`);
  const instance = new ProviderClass();
  return instance.generateText(request as any);
}
