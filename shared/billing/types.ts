export type TxType = "consume" | "refund" | "grant" | "purchase" | "bonus";
export type OrderStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";
export type SubStatus = "active" | "expired" | "cancelled" | "trial" | "pending";
export type ProductType = "plan" | "api_package" | "image_package" | "custom";
export type PaymentProvider = "wechat" | "alipay" | "stripe" | "paypal" | "manual";

/** Billing product catalog entry */
export interface BillingProduct {
  id?: number;
  code: string;
  name: string;
  description?: string;
  product_type?: ProductType;
  priceCents: number;
  currency?: string;
  creditsAmount?: number;
  features?: Record<string, any>;
  status?: "active" | "inactive";
}

/** User subscription */
export interface UserSubscription {
  id?: number;
  userId: number;
  productId: number;
  planCode: string;
  status: SubStatus;
  startAt?: string;
  expireAt?: string;
  autoRenew?: boolean;
}

/** Order */
export interface BillingOrder {
  id?: number;
  orderNo: string;
  userId: number;
  productId?: number;
  amountCents: number;
  currency?: string;
  status: OrderStatus;
  paymentProvider?: PaymentProvider;
  paymentRef?: string;
  paidAt?: string;
  createdAt?: string;
}

/** Transaction record */
export interface BillingTransaction {
  id?: number;
  userId: number;
  orderId?: number;
  subscriptionId?: number;
  txType: TxType;
  amountCents: number;
  balanceBefore?: number;
  balanceAfter?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

/** Pricing rule */
export interface BillingRule {
  id?: number;
  ruleKey: string;
  serviceType?: "ai" | "image" | "agent" | "knowledge";
  target?: string;
  costPer1mInput?: number;
  costPer1mOutput?: number;
  creditsPer1mInput?: number;
  creditsPer1mOutput?: number;
  imageCostCents?: number;
  agentCostCents?: number;
  knowledgeCostCents?: number;
}

/** Plan features for quota management */
export interface PlanFeatures {
  [featureKey: string]: number | "unlimited";
}

/** Consume result */
export interface ConsumeResult {
  success: boolean;
  consumedCents: number;
  balanceBefore: number;
  balanceAfter: number;
  error?: string;
}
