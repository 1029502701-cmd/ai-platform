/**
 * Billing Core Module Type Definitions
 */

export type Currency = 'CNY' | 'USD';

export type BillingCycle = 'month' | 'year' | 'lifetime';

export type TransactionType = 'charge' | 'refund' | 'topup' | 'credit_use' | 'subscription' | 'adjustment';

export type TxStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type PlanName = 'Free' | 'Basic' | 'Pro' | 'Enterprise';

export type ServiceType = 'ai_chat' | 'image_gen' | 'api' | 'plugin' | 'agent_exec' | 'knowledge';

export type ResourceType = 'input_token' | 'output_token' | 'image' | 'api_call' | 'plugin_call';

export interface Wallet {
  id: string;
  userId: string;
  credits: number;
  totalUsed: number;
  balanceCents: number;
  currency: Currency;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  orderId?: string;
  subscriptionId?: string;
  txType: TransactionType;
  amountCents: number;
  balanceBefore: number;
  balanceAfter: number;
  reason?: string;
  metadata?: Record<string, any>;
  status: TxStatus;
  createdAt: string;
  idempotencyKey?: string;
}

export interface UsageRecord {
  id: string;
  userId: string;
  serviceType: ServiceType;
  resourceType?: ResourceType;
  amount: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface FeatureConfig {
  maxConversations: number;
  maxImagesPerMonth: number;
  maxAPICallsPerMonth: number;
  maxPluginCallsPerMonth: number;
  prioritySupport: boolean;
  customBranding: boolean;
  dataExport: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  price: number;
  currency: Currency;
  billingCycle: BillingCycle;
  creditLimit: number;
  featureConfig: FeatureConfig;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planCode: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'trial';
  startAt: string;
  expireAt?: string;
  autoRenew: boolean;
  paymentProvider?: string;
  paymentRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingOrder {
  id: string;
  orderNo: string;
  userId: string;
  productId?: string;
  amountCents: number;
  currency: Currency;
  status: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentProvider?: string;
  paymentRef?: string;
  paidAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  createdAt: string;
}

export enum BillingEventType {
  CREATED = 'billing.created',
  CHARGE = 'billing.charge',
  REFUND = 'billing.refund',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_EXPIRED = 'subscription.expired',
  CREDIT_LOW = 'credit.low',
}

export interface BillingEvent {
  id: string;
  eventType: BillingEventType;
  payload: any;
  userId?: string;
  createdAt: string;
}

export interface BillingRepository {
  getWallet(userId: string): Promise<Wallet | null>;
  createWallet(userId: string, initialCredits: number): Promise<Wallet>;
  updateWallet(userId: string, updates: Partial<Omit<Wallet, 'id'>>): Promise<void>;
  createTransaction(tx: Omit<CreditTransaction, 'id'>): Promise<CreditTransaction>;
  findTransactionById(id: string): Promise<CreditTransaction | null>;
  listTransactionsByUser(userId: string, limit?: number, offset?: number): Promise<CreditTransaction[]>;
  checkIdempotency(key: string): Promise<CreditTransaction | null>;
  saveIdempotency(key: string, result: any): Promise<void>;
  createUsageRecord(record: Omit<UsageRecord, 'id'>): Promise<UsageRecord>;
  listUsageByUserAndDate(userId: string, start: string, end: string, limit?: number, offset?: number): Promise<UsageRecord[]>;
  getDailyUsage(userId: string, date: string): Promise<UsageRecord[]>;
  getPlanByName(name: PlanName): Promise<SubscriptionPlan | null>;
  getAllPlans(): Promise<SubscriptionPlan[]>;
  createSubscription(subscription: Omit<Subscription, 'id'>): Promise<Subscription>;
  getSubscriptionByUserId(userId: string): Promise<Subscription | null>;
  updateSubscription(id: string, updates: Partial<Omit<Subscription, 'id'>>): Promise<void>;
  cancelSubscription(id: string): Promise<void>;
  createOrder(order: Omit<BillingOrder, 'id'>): Promise<BillingOrder>;
  getOrderByNo(orderNo: string): Promise<BillingOrder | null>;
  incrementMetric(metricName: string, value: number, module: string, userId?: string): Promise<void>;
  getMetric(metricName: string): Promise<number | null>;
}

export interface PaymentProvider {
  name: string;
  charge(userId: string, planId: string, amountCents: number, currency: Currency, metadata?: any): Promise<{
    success: boolean;
    transactionId: string;
    orderId?: string;
  }>;
  refund(orderId: string): Promise<{
    success: boolean;
    transactionId: string;
  }>;
  createSubscriptionCustomer(userId: string, email?: string): Promise<{
    success: boolean;
    customerId: string;
  }>;
}
