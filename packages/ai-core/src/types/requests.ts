// Unified AI request builder helpers

import type { AITextRequest, AIChatRequest, ModelConfig } from './index';

export function buildTextRequest(input: Omit<AITextRequest, 'prompt'> & { prompt: string }): AITextRequest {
  return {
    prompt: input.prompt,
    scenario: input.scenario,
    model: input.model,
    variables: input.variables,
    options: input.options,
    userId: input.userId,
    requestId: input.requestId,
  };
}

export function buildChatRequest(input: Omit<AIChatRequest, 'messages'> & { messages: Array<{ role: string; content: string }> }): AIChatRequest {
  return {
    messages: input.messages,
    scenario: input.scenario,
    model: input.model,
    systemPrompt: input.systemPrompt,
    variables: input.variables,
    options: input.options,
    userId: input.userId,
    requestId: input.requestId,
  };
}

export function resolveModelChoice(request: AITextRequest | AIChatRequest, configs: Map<string, ModelConfig>): ModelConfig | null {
  if (request.model) {
    return configs.get(request.model) || null;
  }
  // scenario-based resolution would be handled by scenario manager
  return null;
}
