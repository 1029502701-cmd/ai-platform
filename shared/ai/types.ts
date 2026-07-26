export type AIProviderName = 'openai' | 'gemini' | 'deepseek' | 'anthropic' | 'mock';
export type AIAction = 'generate' | 'stream' | 'embeddings' | 'image';
export type AIStatus = 'success' | 'error' | 'timeout' | 'rate_limited';

export interface AIRequest {
    userId?: string; scenario: string; modelId?: string;
    messages?: Array<{ role: string; content: string }>;
    prompt?: string; variables?: Record<string, any>;
    knowledgeContext?: string; tools?: string[];
    options?: { maxTokens?: number; temperature?: number; topP?: number; timeoutMs?: number; stream?: boolean; retryCount?: number; systemPrompt?: string };
    requestId?: string;
}
export interface AIResponse { content: string; model?: string; provider?: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }; metadata?: Record<string, unknown>; requestId?: string; duration_ms?: number; error?: string; }
export interface AISCENARIO_CONFIG { key: string; name: string; description?: string; defaultModelId?: string; temperature?: number; maxTokens?: number; supportedModels?: string[]; status: 'active'|'disabled'; }
export interface AIProviderContract { id: string; name: string; health(): Promise<'healthy'|'degraded'|'unavailable'>; generateText(request: AIRequest): Promise<AIResponse>; getSupportedModels(): string[]; }
export interface AIMetricsEntry { requestId: string; userId?: string; scenario: string; provider: string; model: string; tokensIn: number; tokensOut: number; durationMs: number; costUsd: number; status: AIStatus; retryCount: number; fallbackUsed: boolean; errorMessage?: string; }
export interface AIToolDefinition { name: string; description: string; parametersSchema?: object; enabled: boolean; }
export interface AIPromptTemplate { id?: number; name: string; scenario: string; content: string; version: number; isActive: boolean; variables: string[]; metadata?: Record<string, unknown>; }
export interface AIModelConfig { modelId: string; provider: string; providerModelName: string; priority: number; status: 'active'|'disabled'; fallbackChain?: string[]; dailyLimit?: number; }
export interface AIExecutionResult { success: boolean; data?: AIResponse; error?: string; metrics?: Partial<AIMetricsEntry>; requestId: string; }
