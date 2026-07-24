import type { TextGenerationRequest, TextGenerationResponse } from './ai_provider_types';

export const MockProvider = {
  id: 'mock',
  name: 'Mock Provider',
  async health() { return 'healthy' as const; },
  async generateText(req: TextGenerationRequest): Promise<TextGenerationResponse> {
    const text = `MOCK RESPONSE for prompt: ${req.prompt}`;
    return { id: 'mock_resp_1', model: 'mock-1', choices: [{ text, index: 0 }], usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, raw: null };
  }
};
