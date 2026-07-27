// ============================================
// AI Core Migration Adapter
// 代理到 packages/ai-core，保持向后兼容
// ============================================

export { ai, generateText, generateChat } from '../../packages/ai-core/src/ai.ts';
export { registerModel, getModelConfig, listActiveModels, loadRegistryFromDB, seedExampleModel } from '../../packages/ai-core/src/model-registry.ts';
export { registerProvider, bootProviders } from '../../packages/ai-core/src/provider-router.ts';
export { MockProvider } from '../../packages/ai-core/src/providers/mock-provider.ts';
export { registerScenario, getScenario, listScenarios, loadScenariosFromDB, resolveDefaultModel } from '../../packages/ai-core/src/scenarios/index.ts';
import { getModelConfig } from '../../packages/ai-core/src/model-registry.ts';

/** Legacy wrapper for backward compatibility */
export async function generateViaCore(modelId: string, request: any): Promise<any> {
  const cfg = await getModelConfig(modelId);
  if (!cfg) throw new Error('MODEL_NOT_FOUND');
  const providerModule = await import(`../../packages/ai-core/src/providers/${cfg.provider}-provider.ts`);
  const ProviderClass = providerModule[`${cfg.provider.charAt(0).toUpperCase() + cfg.provider.slice(1)}Provider`] as any;
  if (!ProviderClass) throw new Error(`PROVIDER_${String(cfg.provider).toUpperCase()}_NOT_IMPLEMENTED`);
  const instance = new ProviderClass();
  return instance.generateText(request as any);
}
