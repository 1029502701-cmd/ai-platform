import type { TextGenerationRequest, TextGenerationResponse } from './ai_provider_types';
import { getLogger } from "../logger";


export class DeepSeekProvider {
  env: any;
  constructor(env: any) { this.env = env; }

  private async fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = 15_000, retries = 1): Promise<Response> {
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
    let key: string | null = null;
    if (this.env && typeof this.env.DEEPSEEK_API_KEY === 'string' && this.env.DEEPSEEK_API_KEY.length > 0) {
      key = this.env.DEEPSEEK_API_KEY;
    }
    if (!key || key.length === 0) throw new Error('DEEPSEEK_API_KEY_NOT_CONFIGURED');
    const authHeader = 'Bearer ' + key;

    const body = {
      model: (req as any).model || 'deepseek-v4-flash',
      messages: [{ role: 'user', content: req.prompt }],
      max_tokens: req.maxTokens ?? 300,
      temperature: req.temperature ?? 0.7,
      top_p: req.topP ?? 1.0,
    };
    const res = await this.fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(body),
    }, 15000, 1);
    const raw = (await res.json()) as Record<string, unknown>;
    const choicesArr = raw.choices as Array<{ message?: { content?: string } }> | undefined;
    const choices = (Array.isArray(choicesArr) ? choicesArr : []).map((c: { message?: { content?: string } }, i: number) => ({ text: c.message?.content ?? '', index: i }));
    const usageRaw = raw.usage as Record<string, unknown> | undefined;
    const usage = usageRaw ? { promptTokens: Number(usageRaw["prompt_tokens"] ?? 0), completionTokens: Number(usageRaw["completion_tokens"] ?? 0), totalTokens: Number(usageRaw["total_tokens"] ?? 0) } : undefined;
    return { id: String(raw.id || ''), model: String(raw.model || 'deepseek-v4-flash'), choices, usage, raw };
  }
}