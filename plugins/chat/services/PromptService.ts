export class PromptService {
  private systemPrompt: string = "You are a helpful assistant.";

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  buildUserPrompt(userMessage: string): string {
    return `${this.systemPrompt}\n\nUser: ${userMessage}\nAssistant:`;
  }

  async loadTemplate(key: string): Promise<string> {
    if (key === "system") return this.systemPrompt;
    return "";
  }
}

export default PromptService;

