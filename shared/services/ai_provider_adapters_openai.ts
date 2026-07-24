import type { TextGenerationRequest, TextGenerationResponse } from './ai_provider_types';

export class OpenAIProvider {
  env: any;
  constructor(env: any) {
    this.env = env;
  }

  // Basic retry + timeout wrapper
  private async fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = 10_000, retries = 1): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(id);
        if (!res.ok && attempt < retries) {
          // small backoff
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          continue;
        }
        return res;
      } catch (err) {
        clearTimeout(id);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new Error('unreachable');
  }

  async generateText(req: TextGenerationRequest): Promise<TextGenerationResponse> {
    const globalProcess: any = (globalThis as any).process;
    const key = this.env?.OPENAI_API_KEY || globalProcess?.env?.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');

    const body = {
      model: (req as any).model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: req.prompt }],
      max_tokens: req.maxTokens ?? 300,
      temperature: req.temperature ?? 0.7,
      top_p: req.topP ?? 1.0,
      stop: req.stop,
    };

    const res = await this.fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    }, 10000, 1);

    const data = await res.json();

    // Map OpenAI response to TextGenerationResponse
    const choices = (data.choices || []).map((c: any, i: number) => ({ text: c.message?.content ?? c.text ?? '', index: c.index ?? i }));

    const usage = data.usage ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens } : undefined;

    return {
      id: data.id || '',
      model: data.model || (body as any).model,
      choices,
      usage,
      raw: data,
    };
  }
}
