// ============================================
// AI Model Manager (Migration Adapter)
// 代理到 packages/ai-core model-registry
// ============================================

export {
  registerModel,
  getModelConfig,
  listActiveModels,
  loadRegistryFromDB as loadModelsFromBindings,
  listActiveModels as listModelsFromMemory,
} from '../../packages/ai-core/src/model-registry.ts';

export type { ModelConfig } from '../../packages/ai-core/src/types/index.ts';

/** Set model status to active/disabled */
/** @deprecated use createOrUpdateModelInDB */
export function setModelStatusInDB(_env: any, modelId: string, status: string): void {
  console.warn("setModelStatusInDB is a stub.");
}

export function setModelStatus(modelId: string, status: 'active' | 'disabled'): void {
  // In-memory only — real implementation should update D1
  console.warn('setModelStatus is in-memory only. Use D1 migration for persistence.');
}

/** Create or update model config in DB */
export function createOrUpdateModelInDB(_env: any, _config: any): void {
  console.warn('createOrUpdateModelInDB is a stub. Requires D1 write access.');
}
