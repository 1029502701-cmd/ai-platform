// ============================================
// AI Core - Unified Types
// ============================================

// --- Provider Interface ---

export type ModelId = string;
export type ProviderId = 'openai' | 'deepseek' | 'mock' | string;

export interface TextGenerationRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  metadata?: Record<string, unknown>;
}

export interface ChatGenerationRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  metadata?: Record<string, unknown>;
}

export interface TextGenerationResponse {
  id: string;
  model: string;
  provider: ProviderId;
  choices: Array<{ text: string; index?: number }>;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  raw?: unknown;
}

export interface ChatGenerationResponse {
  id: string;
  model: string;
  provider: ProviderId;
  choices: Array<{ message: { role: string; content: string }; index?: number }>;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  raw?: unknown;
}

// --- Model Configuration ---

export interface ModelConfig {
  modelId: ModelId;
  provider: ProviderId;
  providerModelName: string;
  defaultParams?: Record<string, unknown>;
  priority?: number;
  regionWhitelist?: string[];
  status?: 'active' | 'disabled';
  displayName?: string;
  description?: string;
  contextLimit?: number;
  costConfig?: Record<string, unknown>;
}

// --- Scenario ---

export type ScenarioType = 'chat' | 'text-generation' | 'completion' | 'custom';

export interface ScenarioDefinition {
  scenarioKey: string;
  name: string;
  type: ScenarioType;
  defaultModelId: ModelId;
  allowedModels?: string[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  variablesSchema?: Record<string, { type: string; required?: boolean; default?: unknown }>;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// --- Unified Request/Response ---

export interface AIGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  timeoutMs?: number;
  retryCount?: number;
  cacheEnabled?: boolean;
}

export interface AITextRequest {
  prompt: string;
  scenario?: string;
  model?: string;
  variables?: Record<string, any>;
  options?: AIGenerationOptions;
  userId?: string;
  requestId?: string;
}

export interface AIChatRequest {
  messages: Array<{ role: string; content: string }>;
  scenario?: string;
  model?: string;
  systemPrompt?: string;
  variables?: Record<string, any>;
  options?: AIGenerationOptions;
  userId?: string;
  requestId?: string;
}

export interface AIUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  provider: ProviderId;
}

export interface AIGenerationResult<T = any> {
  ok: true;
  content: T;
  model: string;
  provider: ProviderId;
  usage?: AIUsageInfo;
  requestId: string;
  timings: { duration: number; providerLatency?: number };
  meta?: { scenario?: string; cached?: boolean };
}

export interface AIErrorResponse {
  ok: false;
  error: string;
  code: string; // e.g., MODEL_NOT_FOUND, PROVIDER_ERROR, RATE_LIMITED, TIMEOUT, BILLING_FAILED
  requestId: string;
  timings: { duration: number };
  details?: string;
}

export type AIResult<T = any> = AIGenerationResult<T> | AIErrorResponse;

// --- Streaming ---

export type ChatChunk = {
  index: number;
  delta: { role?: string; content?: string };
  finishReason?: string | null;
};

export interface AIStreamCallbacks {
  onChunk?: (chunk: ChatChunk) => void;
  onComplete?: (result: { model: string; usage?: AIUsageInfo; finishReason?: string }) => void;
  onError?: (error: Error) => void;
}

export interface AIStreamResult {
  close(): void;
}
