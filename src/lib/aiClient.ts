/**
 * Official JavaScript/TypeScript SDK for AI Platform.
 * 
 * Usage:
 *   const client = new AIClient({ apiKey: 'ak_xxx', baseUrl: 'https://api.example.com' });
 *   
 *   const result = await client.chat({ messages: [{ role: 'user', content: 'Hello!' }] });
 */

interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  scenario?: string;
  variables?: Record<string, any>;
  knowledgeBaseId?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    content: string;
    model: string;
    provider: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  };
  error?: string;
  requestId?: string;
}

export class AIClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: ClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || '';
  }

  /**
   * Send a chat request to the AI platform.
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/openapi/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.message || data.error, requestId: data.meta?.requestId };
    }

    return { success: true, data: data.data, requestId: data.meta?.requestId };
  }

  /**
   * Stream a chat response (SSE).
   */
  async *streamChat(request: ChatRequest): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/openapi/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || err.error || 'Stream failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No stream available');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = new TextDecoder().decode(value);
      // Parse SSE format: "data: {...}\n\n"
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            yield parsed.content || '';
          } catch {}
        }
      }
    }
  }

  /**
   * Query models available for chat.
   */
  async getModels(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/openapi/v1/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data?.models || [];
  }
}