import type { ModelConfig } from "./ai_provider_types";

// Simple in-memory registry backed by D1/KV in real implementation
const registry: Record<string, ModelConfig> = {};

export async function registerModel(cfg: ModelConfig) {
  registry[cfg.modelId] = cfg;
}

export async function getModelConfig(modelId: string): Promise<ModelConfig | null> {
  return registry[modelId] || null;
}

// seed helper
export async function seedExample() {
  await registerModel({ modelId: 'mock-text-1', provider: 'mock', providerModelName: 'mock-1', defaultParams: { temperature: 0.7 }, priority: 10, status: 'active' });
}
