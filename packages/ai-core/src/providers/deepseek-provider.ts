// DeepSeek provider

import type { TextGenerationRequest, TextGenerationResponse } from '../types/index';
import { BaseProvider } from './base-provider';

export class DeepSeekProvider extends BaseProvider {
  constructor(env?: any) {
    super('deepseek', 'DeepSeek', env);
  }

  async health() {
    return 'healthy' as const;
  }

  async generateText(req: TextGenerationRequest): Promise<TextGenerationResponse> {
    const key = this.getApiKey();
    if (!key) throw new Error('DEEPSEEK_API_KEY_NOT_CONFIGURED');

    const model = (req as any).model || 'deepseek-v4-flash';
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: req.prompt }],
      max_tokens: req.maxTokens ?? 300,
      temperature: req.temperature ?? 0.7,
      top_p: req.topP ?? 1.0,
    };
    if (req.stop) body['stop'] = req.stop;

    const res = await this.fetchWithTimeout(
      'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: Bearer ,
        },
        body: JSON.stringify(body),
      },
      15_000,
      1
    );

    const data = await res.json();
    const choices = (data.choices || []).map((c: any, i: number) => ({
      text: c.message?.content ?? '',
      index: i,
    }));
    const usage = data.usage
      ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens }
      : undefined;

    return {
      id: data.id || '',
      model: data.model || model,
      provider: this.id,
      choices,
      usage,
      raw: data,
    };
  }

  private getApiKey(): string | null {
    if (this.env && typeof this.env.DEEPSEEK_API_KEY === 'string' && this.env.DEEPSEEK_API_KEY.length > 0) {
      return this.env.DEEPSEEK_API_KEY;
    }
    return null;
  }
}
