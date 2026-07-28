import { ChatService as BaseChatService } from "../../services/ChatService";
import { ConversationRepository } from "../../repositories/ConversationRepository";
import { MessageRepository } from "../../repositories/MessageRepository";
import { getScenario } from "../../../packages/ai-core/src/scenarios/index";
import { ai } from "../../../packages/ai-core/src/ai";
import BillingService from "../../../shared/billing/service";

export class ChatService {
  private conversationRepo = new ConversationRepository();
  private messageRepo = new MessageRepository();

  async getChatConfig(): Promise<any> {
    const scenario = getScenario("chat");
    if (!scenario) {
      return {
        defaultModel: "deepseek-chat",
        maxTokens: 4096,
        temperature: 0.7,
        systemPrompt: "You are a helpful assistant.",
        scenarioKey: "chat",
      };
    }
    return {
      defaultModel: scenario.defaultModelId || "deepseek-chat",
      maxTokens: scenario.maxTokens || 4096,
      temperature: scenario.temperature || 0.7,
      systemPrompt: scenario.systemPrompt || "You are a helpful assistant.",
      scenarioKey: scenario.scenarioKey,
    };
  }

  async createConversation(userId: string, title?: string, model?: string) {
    const config = await this.getChatConfig();
    const now = new Date().toISOString();
    const conversation = {
      id: crypto.randomUUID(),
      userId,
      title: title || `¶Ô»° ${now}`,
      model: model || config.defaultModel,
      status: "active",
      messageCount: 0,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.conversationRepo.insert(conversation);
    return conversation;
  }

  async getMessageHistory(conversationId: string, userId: string, limit = 20) {
    const conv = await this.conversationRepo.getByID(conversationId);
    if (!conv || conv.userId !== userId) {
      throw new Error("CONVERSATION_NOT_FOUND_OR_ACCESS_DENIED");
    }
    return await this.messageRepo.findByConversation(conversationId, limit);
  }

  async addMessageToConversation(conversationId: string, role: "user" | "assistant", content: string, tokens?: number) {
    const message = {
      id: crypto.randomUUID(),
      conversationId,
      role,
      content,
      tokens: tokens || 0,
      createdAt: new Date().toISOString(),
    };
    await this.messageRepo.insert(message);
    await this.conversationRepo.updateLastMessage(conversationId, message.createdAt);
    return message;
  }

  async sendMessage(userId: string, conversationId: string, message: string, env: any) {
    await this.addMessageToConversation(conversationId, "user", message);

    const config = await this.getChatConfig();
    const inputTokens = Math.max(1, Math.ceil(message.length / 4));
    const estimatedCost = Math.max(1, Math.ceil(inputTokens / 1000));
    const userIdNum = parseInt(userId) || 0;

    const billingResult = await BillingService.consume(env, {
      userId: userIdNum,
      amountCents: estimatedCost,
      reason: "AI_CHAT",
      metadata: { conversationId, inputTokens, model: config.defaultModel },
    });

    if (!billingResult.success) {
      await this.messageRepo.deleteLast(conversationId);
      throw new Error(`INSUFFICIENT_BALANCE: ${billingResult.error}`);
    }

    const prompt = `System: ${config.systemPrompt}\nUser: ${message}\nAssistant:`;
    
    try {
      const result = await ai.generateText({
        requestId: crypto.randomUUID(),
        prompt,
        scenario: "chat",
        userId,
        options: {
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        },
      }, env);

      if (result.ok) {
        const outputTokens = result.usage?.completionTokens || 0;
        await this.addMessageToConversation(
          conversationId,
          "assistant",
          result.content,
          outputTokens
        );

        return {
          message: result.content,
          usage: {
            inputTokens,
            outputTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
          },
          conversationId,
          modelUsed: config.defaultModel,
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new Error(result.error || "AI_GENERATION_FAILED");
      }
    } catch (error: any) {
      await BillingService.refund(env, {
        userId: userIdNum,
        amountCents: estimatedCost,
        reason: "AI_CHAT_ERROR",
      });
      throw error;
    }
  }

  async getConversationHistory(conversationId: string, userId: string) {
    const conversation = await this.conversationRepo.getByID(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("CONVERSATION_NOT_FOUND_OR_ACCESS_DENIED");
    }
    const messages = await this.messageRepo.findByConversation(conversationId, 100);
    return { conversation, messages, hasMore: messages.length >= 100 };
  }

  async listConversations(userId: string, limit = 20) {
    const conversations = await this.conversationRepo.findByUser(userId, limit);
    return { conversations, hasMore: conversations.length === limit };
  }

  async archiveConversation(conversationId: string, userId: string) {
    const conv = await this.conversationRepo.getByID(conversationId);
    if (!conv || conv.userId !== userId) {
      throw new Error("CONVERSATION_NOT_FOUND_OR_ACCESS_DENIED");
    }
    await this.conversationRepo.updateStatus(conversationId, "archived");
  }
}

export default ChatService;

