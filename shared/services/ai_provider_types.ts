// AI provider types for service layer
export type ModelId = string;

export interface TextGenerationRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  metadata?: Record<string, unknown>;
}

export interface TextGenerationResponse {
  id: string;
  model: string;
  choices: Array<{ text: string; index?: number }>;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  raw?: unknown;
}

export interface ModelConfig {
  modelId: ModelId;
  provider: string;
  providerModelName: string;
  defaultParams?: Record<string, unknown>;
  priority?: number;
  regionWhitelist?: string[];
  status?: 'active' | 'disabled';
}
