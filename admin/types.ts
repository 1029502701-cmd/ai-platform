// Admin Center — shared types across all admin pages and APIs

export type AdminUserRole = 'admin' | 'operator' | 'partner';

export interface AdminSession {
  userId: string;
  role: AdminUserRole;
  nickname?: string;
}

/** User list item */
export interface AdminUserItem {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  type: string;        // guest | wechat | user
  role: string;
  status: string;
  email: string | null;
  createdAt: string;
  lastLoginAt?: string;
}

/** Dashboard stat cards */
export interface DashboardStats {
  totalUsers: number;
  guestCount: number;
  wechatCount: number;
  vipCount: number;
  todayAiCalls: number;
  totalAiCalls: number;
  aiCostUsd: number;
  totalRevenue: number;
  failedTasks: number;
}

/** AI model entry */
export interface AdminModelItem {
  id: string;
  name: string;
  provider: string;
  providerModelName: string;
  status: 'active' | 'disabled';
  priority: number;
  defaultParams?: Record<string, unknown>;
}

/** Scenario entry */
export interface AdminScenarioItem {
  scenarioKey: string;
  name: string;
  type: string;
  defaultModelId: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  variablesSchema?: Record<string, unknown>;
  enabled: boolean;
  createdAt?: string;
}

/** AI Task for monitoring */
export interface AdminTaskItem {
  id: string;
  type: string;
  status: string;
  priority: string;
  payload?: any;
  result?: any;
  retry_count: number;
  locked_by: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  last_error: string | null;
}

/** Transaction record */
export interface AdminTransactionItem {
  id: string;
  userId: string;
  type: string;
  amount: number;
  service: string;
  model: string;
  status: string;
  transactionId: string;
  costUsd: number;
  createdAt: string;
}

/** Wallet info */
export interface AdminWalletItem {
  id: string;
  userId: string;
  credits: number;
  totalUsed: number;
  mode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Response wrapper */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | null;
  meta: Record<string, unknown>;
}

/** Agent entry */
export interface AdminAgentItem {
  id: number;
  key: string;
  name: string;
  description?: string;
  status: string;
  defaultModel?: string;
  maxSteps?: number;
}

/** Agent task entry */
export interface AdminAgentTaskItem {
  id: number;
  userId?: number;
  userName?: string;
  agentKey: string;
  agentName: string;
  status: string;
  currentStep?: string;
  stepsCompleted: number;
  totalSteps: number;
  createdAt?: string;
  finishedAt?: string;
}
