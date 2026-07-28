import { registerScenario } from "../../../packages/ai-core/src/scenarios/index";

export function registerChatScenario(): void {
  registerScenario({
    scenarioKey: "chat",
    name: "AI 聊天",
    type: "chat",
    defaultModelId: "deepseek-chat",
    systemPrompt: "你是一个智能AI助手，用中文回答用户的问题。",
    maxTokens: 4096,
    temperature: 0.7,
    enabled: true,
  });
}

// Register immediately when imported
registerChatScenario();

