import { PluginManifest, PluginCapabilityType, PluginBilling } from "../../../shared/plugin/types";

export const manifest: PluginManifest = {
  id: "chat",
  name: "AI Chat",
  version: "0.1.0",
  description: "AI Chat plugin with conversation history, token billing, and AI Core integration",
  author: {
    name: "Sapiens AI",
    email: "api@sapiens.ai",
    url: "https://sapiens.ai",
  },
  category: "tool",
  capabilities: [
    PluginCapabilityType.CHAT,
    PluginCapabilityType.BILLING,
    PluginCapabilityType.ANALYSIS,
  ],
  permissions: [
    "billing:consume",
    "storage:get",
    "queue:submit",
  ],
  events: [
    {
      name: "conversation.created",
      description: "Triggered when a new chat conversation is created",
    },
    {
      name: "message.sent",
      description: "Triggered when a user sends a message in chat",
    },
    {
      name: "chat.completed",
      description: "Triggered when a chat interaction is completed",
    },
  ],
  routes: [
    {
      path: "/api/chat/send",
      handler: "routes/chat.handleSend",
      requireAuth: true,
      requiredPermissions: ["chat:send"],
    },
    {
      path: "/api/chat/history/:id",
      handler: "routes/chat.handleHistory",
      requireAuth: true,
      requiredPermissions: ["chat:read"],
    },
    {
      path: "/api/chat/conversations",
      handler: "routes.chat.handleListConversations",
      requireAuth: true,
      requiredPermissions: ["chat:read"],
    },
  ],
  metrics: [
    {
      name: "chat_requests",
      description: "Number of chat requests made",
      type: "counter",
      unit: "count",
    },
    {
      name: "chat_tokens_used",
      description: "Total tokens used in chat",
      type: "counter",
      unit: "count",
    },
    {
      name: "chat_latency_ms",
      description: "Chat response latency",
      type: "histogram",
      unit: "ms",
    },
  ],
  billing: {
    model: "credit-based",
    creditRates: {
      input: 0.0001, // per 1k tokens
      output: 0.0003, // per 1k tokens
    },
  },
  minPlatformVersion: "1.0.0",
  dependencies: {
    "ai-core": [">=1.0.0"],
    "auth": [">=1.0.0"],
    "billing": [">=1.0.0"],
  }
};
