import type { TextGenerationRequest, TextGenerationResponse } from './ai_provider_types';
import { getLogger } from "../logger";


export class OpenAIProvider {
  env: any;
  constructor(env: any) { this.env = env; }

  private async fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = 10_000, retries = 1): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(id);
        if (!res.ok && attempt < retries) { await new Promise((r) => setTimeout(r, 200 * (attempt + 1))); continue; }
        return res;
      } catch (err) {
        clearTimeout(id);
        if (attempt < retries) { await new Promise((r) => setTimeout(r, 200 * (attempt + 1))); continue; }
        throw err;
      }
    }
    throw new Error('unreachable');
  }

  async generateText(req: TextGenerationRequest): Promise<TextGenerationResponse> {
    let key = null;
    if (this.env && typeof this.env.OPENAI_API_KEY === 'string' && this.env.OPENAI_API_KEY.length > 0) {
      key = this.env.OPENAI_API_KEY;
    }
    if (!key || key.length === 0) throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
    const authHeader = 'Bearer ' + key;

    const body = {
      model: (req as any).model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: req.prompt }],
      max_tokens: req.maxTokens ?? 300,
      temperature: req.temperature ?? 0.7,
      top_p: req.topP ?? 1.0,
    };
    const res = await this.fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(body),
    }, 10000, 1);
    const data = await res.json();
    const choices = (data.choices || []).map((c: any, i: number) => ({ text: c.message?.content ?? '', index: i }));
    const usage = data.usage ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens } : undefined;
    return { id: data.id || '', model: data.model || 'gpt-3.5-turbo', choices, usage, raw: data };
  }
}
