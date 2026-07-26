// ============================================
// Billing Core — 统一类型定义
// ============================================

export type WalletId = string;
export type TransactionId = string;
export type CreditType = 'balance' | 'points' | 'package';

// --- Balance Modes ---

/**
 * 余额模式 (Balance)
 * 充值后直接增加 credits，消费时减少。
 */
export interface BalanceConfig {
  mode: 'balance';
  defaultTopUpAmount: number;     // 默认充值金额
  minTransaction: number;         // 最小交易单位
}

/**
 * 积分模式 (Points)
 * 每次消耗固定积分，积分可通过购买获得。
 */
export interface PointsConfig {
  mode: 'points';
  pointsPerCredit: number;        // 1 credit = N points
  pointsExpirationDays?: number;  // 积分过期天数
}

/**
 * 套餐模式 (Package)
 * 订阅按月/按年自动发放配额。
 */
export interface PackageConfig {
  mode: 'package';
  maxConcurrentSubscriptions: number;
}

export type BillingMode = BalanceConfig | PointsConfig | PackageConfig;

// --- Wallet ---

export interface Wallet {
  id: WalletId;
  userId: string;
  credits: number;                // 可用积分/额度
  frozenCredits?: number;          // 冻结中积分（reserve后暂存）
  totalUsed: number;              // 累计消耗
  totalToppedUp: number;          // 累计充值
  mode: CreditType;               // balance | points | package
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

// --- Transaction ---

export type TransactionType =
  | 'consume'             // 消费（AI调用、功能使用）
  | 'refund'              // 退款
  | 'topup'               // 充值（手动）
  | 'subscription_grant'  // 订阅赠送积分
  | 'subscription_expire' // 订阅到期扣减
  | 'system_adjustment';  // 系统调整

export interface Transaction {
  id: TransactionId;
  userId: string;
  type: TransactionType;
  amount: number;           // 正数=加，负数=扣
  service: string;          // 触发方: 'ai_chat', 'beauty', 'admin'
  model?: string;           // 模型ID（AI相关）
  inputTokens?: number;
  outputTokens?: number;
  creditsPerToken?: number;
  costUsd?: number;         // 美元成本记录
  status: 'pending' | 'completed' | 'failed';
  transactionId: string;    // 幂等键
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// --- AI Usage ---

export interface AIUsage {
  id: string;
  userId: string;
  service: string;          // text-generation / chat / image
  model: string;
  inputTokens: number;
  outputTokens: number;
  creditsUsed: number;      // 实际消耗积分
  costUsd: number;          // 成本美元
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  createdAt: string;
}

// --- Pricing ---

export interface AIPricingRule {
  id: string;
  service: string;
  model: string;
  creditsPer100Tokens: number;  // 每100token的积分消耗
  costUsdPer100Tokens: number;  // 每100token的成本
  enabled: boolean;
  priority: number;             // 越高越优先匹配
  createdAt: string;
}

// --- Quota / Rules ---

export type QuotaScope = 'user' | 'role' | 'global';

export interface QuotaRule {
  id: string;
  name: string;
  description?: string;
  scope: QuotaScope;
  scopeTarget: string;       // userId, role, or 'global'
  ruleType: 'daily_limit' | 'monthly_limit' | 'concurrent_limit' | 'rate_limit';
  limit: number;             // 限制值
  periodStart?: string;      // 周期开始时间（用于reset）
  used?: number;             // 已用
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Plan & Subscription ---

export interface Plan {
  id: string;
  name: string;
  priceCents: number;           // 以分为单位
  currency: string;             // CNY, USD
  credits: number;              // 购买后获得的积分
  durationDays: number;         // 套餐有效期(天)
  enabled: boolean;
  features: Record<string, string>;  // feature_key -> value
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  startTime: string;
  expireTime: string;
  status: 'active' | 'expired' | 'cancelled' | 'refunded';
  autoRenew: boolean;
  paidAmount: number;
  paidCurrency: string;
  createdAt: string;
}

// --- Usage Limit ---

export interface UsageLimit {
  userId: string;
  dailyFreeCount: number;       // 每日免费次数
  usedCount: number;            // 今日已用
  resetTime: string;            // 下次重置时间
}

// --- API Results ---

export interface BalanceResult {
  ok: true;
  wallet: Wallet;
}

export interface BalanceNotAvailable {
  ok: false;
  error: string;
  code: 'WALLET_NOT_FOUND' | 'USER_SUSPENDED';
}

export type GetBalanceResult = BalanceResult | BalanceNotAvailable;

export interface ConsumeResult {
  success: true;
  remaining: number;
  transactionId: string;
}

export interface ConsumeFailure {
  success: false;
  error: string;
  code: 'INSUFFICIENT_CREDITS' | 'WALLET_NOT_FOUND' | 'DUPLICATE_TRANSACTION' | 'INVALID_AMOUNT';
}

export type ConsumeResultType = ConsumeResult | ConsumeFailure;

export interface RefundResult {
  ok: true;
  refundedCredits: number;
  newBalance: number;
  transactionId: string;
}

export interface RefundFailure {
  ok: false;
  error: string;
  code: string;
}

export type RefundResultType = RefundResult | RefundFailure;

export interface AddBalanceResult {
  ok: true;
  addedCredits: number;
  newBalance: number;
  transactionId: string;
}

export interface AddBalanceFailure {
  ok: false;
  error: string;
  code: string;
}

export type AddBalanceResultType = AddBalanceResult | AddBalanceFailure;

export interface QuotaCheckResult {
  allowed: boolean;
  remaining?: number;
  dailyUsed?: number;
  dailyLimit?: number;
  reason?: string;
}

export interface PricingCalcResult {
  creditsNeeded: number;
  costUsd: number;
  pricingRule?: AIPricingRule;
}

// --- Migration ---

export interface Migration {
  version: number;
  name: string;
  sql: string[];
  appliedAt?: string;
}

export const MIGRATION_VERSIONS: Migration[] = [
  {
    version: 1,
    name: 'create_billing_tables',
    sql: [/* defined in migration file */],
  },
];

// --- Reservation (Queue Integration) ---

export type ReservationStatus = 'pending' | 'committed' | 'refunded' | 'expired' | 'cancelled';

export interface BillingReservation {
  id: string;
  userId: string;
  taskId: string | null;           // linked queue task id
  amount: number;                   // credits frozen
  status: ReservationStatus;
  idempotencyKey: string;           // prevents double-reserve
  reservedAt: string;
  expiresAt: string;                // auto-expire TTL
}

// --- Reserve/Commit/Refund API Results ---

export interface ReserveResult {
  success: true;
  reservationId: string;
  wallet: Wallet;
}

export interface ReserveFailure {
  success: false;
  error: string;
  code: 'INSUFFICIENT_CREDITS' | 'DUPLICATE_RESERVATION' | 'EXPIRED' | 'WALLET_NOT_FOUND';
}

export type ReserveResultType = ReserveResult | ReserveFailure;

export interface CommitResult {
  success: true;
  actualCost: number;                 // final credits consumed (may differ from reserve)
  refundAmount: number;               // excess reserved - actually used
  wallet: Wallet;
  transactionId: string;
  usageRecord?: AIUsage;
}

export interface CommitFailure {
  success: false;
  error: string;
  code: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_COMMITTED' | 'ALREADY_REFUNDED' | 'INVALID_AMOUNT';
}

export type CommitResultType = CommitResult | CommitFailure;

export interface RefundResult {
  success: true;
  refundedCredits: number;
  newBalance: number;
  wallet: Wallet;
}

export interface RefundFailure {
  success: false;
  error: string;
  code: string;
}

export type RefundResultType = RefundResult | RefundFailure;

export interface ExpiredReservationReport {
  total: number;
  tasksReleased: string[];
}
