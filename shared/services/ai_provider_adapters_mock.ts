import type { TextGenerationRequest, TextGenerationResponse } from '../../packages/ai-core/src/types/index.ts';
import { BaseProvider } from '../../packages/ai-core/src/providers/base-provider';

export class MockAdapter extends BaseProvider {
  constructor(env?: any) {
    super('mock', 'Mock Provider', env);
  }

  override async health(): Promise<"healthy" | "unhealthy"> {
    return 'healthy';
  }

  override generateText(req: TextGenerationRequest): Promise<TextGenerationResponse> {
    const text = `MOCK RESPONSE for prompt: ${req.prompt}`;
    return Promise.resolve({
      id: 'mock_resp_1',
      model: 'mock-1',
      provider: 'mock',
      choices: [{ text, index: 0 }],
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      raw: null,
    });
  }

  // generateChat is handled by BaseProvider fallback
}
