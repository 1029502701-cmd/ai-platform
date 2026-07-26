// Mock provider for local development and testing

import type { TextGenerationRequest, TextGenerationResponse } from '../types/index';
import { BaseProvider } from './base-provider';

export class MockProvider extends BaseProvider {
  constructor(env?: any) {
    super('mock', 'Mock Provider', env);
  }

  async health() {
    return 'healthy' as const;
  }

  async generateText(req: TextGenerationRequest): Promise<TextGenerationResponse> {
    return {
      id: mock_,
      model: req.model || 'mock-default',
      provider: this.id,
      choices: [{ text: [MOCK]  }],
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      raw: null,
    };
  }
}
