// Base provider interface that all AI providers must implement

import type {
  TextGenerationRequest,
  TextGenerationResponse,
  ChatGenerationRequest,
  ChatGenerationResponse,
  ProviderId,
} from '../types/index';

export abstract class BaseProvider {
  readonly id: ProviderId;
  readonly name: string;
  protected env: any;

  constructor(id: ProviderId, name: string, env?: any) {
    this.id = id;
    this.name = name;
    this.env = env;
  }

  // Check if this provider is healthy/configured
  abstract health(): Promise<'healthy' | 'unhealthy'>;

  // Text generation (single prompt -> single response)
  abstract generateText(req: TextGenerationRequest): Promise<TextGenerationResponse>;

  // Chat generation (message history -> response)
  async generateChat(req: ChatGenerationRequest): Promise<ChatGenerationResponse> {
    // Default: fallback to text generation with prompt
    const prompt = req.messages.map(m => `${m.role}:`).join('\n');
    const textReq: TextGenerationRequest = {
      prompt,
      maxTokens: req.maxTokens,
      temperature: req.temperature,
      topP: req.topP,
      stop: req.stop,
      metadata: req.metadata,
    };
    const resp = await this.generateText(textReq);
    return {
      id: resp.id,
      model: resp.model,
      provider: this.id,
      choices: resp.choices.map(c => ({ message: { role: 'assistant', content: c.text }, index: c.index })),
      usage: resp.usage,
      raw: resp.raw,
    };
  }

  // Utility: fetch with timeout and retry
  protected async fetchWithTimeout(
    url: string,
    opts: RequestInit,
    timeoutMs: number,
    retries: number
  ): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(id);
        if (!res.ok && attempt < retries) {
          await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
          continue;
        }
        return res;
      } catch (err) {
        clearTimeout(id);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new Error('fetch_unreachable');
  }
}
