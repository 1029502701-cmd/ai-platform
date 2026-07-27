// OpenAI provider (GPT-3.5/4)

import type { TextGenerationRequest, TextGenerationResponse } from '../types/index';
import { BaseProvider } from './base-provider';

export class OpenAIProvider extends BaseProvider {
  constructor(env?: any) {
    super('openai', 'OpenAI', env);
  }

  async health() {
    return 'healthy' as const;
  }

  async generateText(req: TextGenerationRequest): Promise<TextGenerationResponse> {
    const key = this.getApiKey();
    if (!key) throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');

    const model = (req as any).model || 'gpt-3.5-turbo';
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: req.prompt }],
      max_tokens: req.maxTokens ?? 300,
      temperature: req.temperature ?? 0.7,
      top_p: req.topP ?? 1.0,
    };
    if (req.stop) body['stop'] = req.stop;

    const res = await this.fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
'Authorization': `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify(body),
      },
      10_000,
      1
    );

    const respData: any = await res.json();
    const choices = ((respData as any).choices || []).map((c: any, i: number) => ({
      text: c.message?.content ?? '',
      index: i,
    }));
    const usage = (respData as any).usage
      ? { promptTokens: (respData as any).usage.prompt_tokens, completionTokens: (respData as any).usage.completion_tokens, totalTokens: (respData as any).usage.total_tokens }
      : undefined;

    return {
      id: (respData as any).id || '',
      model: (respData as any).model || model,
      provider: this.id,
      choices,
      usage,
      raw: respData,
    };
  }

  private getApiKey(): string | null {
    if (this.env && typeof this.env.OPENAI_API_KEY === 'string' && this.env.OPENAI_API_KEY.length > 0) {
      return this.env.OPENAI_API_KEY;
    }
    return null;
  }
}
