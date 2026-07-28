export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface Message {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  tokens?: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  model?: string;
  status: "active" | "archived" | "deleted";
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSendRequest {
  conversationId?: string;
  message: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatSendResponse {
  message: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  conversationId: string;
  modelUsed: string;
  timestamp: string;
}

export interface ChatHistoryResponse {
  conversation: Conversation;
  messages: Message[];
  hasMore: boolean;
}

export interface ChatListResponse {
  conversations: Conversation[];
  hasMore: boolean;
  nextPageCursor?: string;
}

export type { ChatRole, Message, Conversation, ChatSendRequest, ChatSendResponse, ChatHistoryResponse, ChatListResponse };

