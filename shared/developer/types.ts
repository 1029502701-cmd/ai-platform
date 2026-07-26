/**
 * Open Platform Types — developers, API keys, webhooks, usage tracking.
 */

export type DeveloperStatus = 'active' | 'suspended' | 'deleted';
export type ApiKeyStatus = 'active' | 'expired' | 'revoked' | 'disabled';
export type WebhookStatus = 'pending' | 'delivered' | 'failed';
export type ResourceType = 'chat' | 'image' | 'agent' | 'workflow' | 'knowledge' | 'custom';

export interface Developer {
  id: number;
  tenantId: number;
  name: string;
  company?: string;
  email: string;
  status: DeveloperStatus;
  createdAt: string;
}

export interface ApiKey {
  id: number;
  developerId: number;
  key: string;       // The public key (stored as hash for matching)
  name: string;
  permissions: string[];
  dailyQuota: number;
  monthlyQuota: number;
  status: ApiKeyStatus;
  expiresAt?: string;
  ipWhitelist?: string[];
  createdAt: string;
}

export interface ApiUsage {
  id: number;
  developerId: number;
  apiKeyId: number;
  resourceType: ResourceType;
  endpoint: string;
  requestsToday: number;
  requestsMonth: number;
  tokensUsed: number;
  costCents: number;
  errors: number;
  avgLatencyMs: number;
  lastRequestAt?: string;
}

export interface Webhook {
  id: number;
  developerId: number;
  url: string;
  events: string[];      // payment.success, agent.completed, etc.
  secret?: string;        // HMAC signature key
  status: WebhookStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
}

export interface WebhookEvent {
  id: number;
  webhookId: number;
  eventType: string;     // agent.completed, payment.success, etc.
  payload: Record<string, any>;
  deliveredAt?: string;
  lastResponseCode?: number;
  retries: number;
}

export interface ApiLog {
  id: number;
  developerId: number;
  apiKeyId: number;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  ip: string;
  userAgent: string;
  requestId: string;
  createdAt: string;
}