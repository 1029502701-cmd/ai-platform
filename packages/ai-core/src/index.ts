// ============================================
// AI Core - Package Entry Point
// ============================================

export { ai, generateText, generateChat } from './ai';
export { registerProvider, getProvider, listRegisteredProviders } from './provider-router';
export { registerModel, getModelConfig, listActiveModels, loadRegistryFromDB, invalidateCache } from './model-registry';
export { registerScenario, getScenario, listScenarios, loadScenariosFromDB, resolveDefaultModel } from './scenarios/index';

// Provider classes
export { BaseProvider } from './providers/base-provider';
export { MockProvider } from './providers/mock-provider';
export { OpenAIProvider } from './providers/openai-provider';
export { DeepSeekProvider } from './providers/deepseek-provider';

// Types
export * from './types/index';
