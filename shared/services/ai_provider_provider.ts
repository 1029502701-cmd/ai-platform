import type { TextGenerationRequest, TextGenerationResponse } from "./ai_provider_types";

export interface IProvider {
  id: string;
  name?: string;
  health(): Promise<'healthy'|'degraded'|'unavailable'>;
  generateText(request: TextGenerationRequest): Promise<TextGenerationResponse>;
}
