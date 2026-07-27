// ============================================
// AI Provider Registry (Migration Adapter)
// 代理到 packages/ai-core，保持向后兼容
// ============================================

export {
  getModelConfig,
  loadRegistryFromDB as loadRegistryFromBindings,
  registerModel,
  seedExampleModel as seedExample,
  listActiveModels,
} from '../../packages/ai-core/src/model-registry.ts';

export type { ModelConfig } from '../../packages/ai-core/src/types/index.ts';
