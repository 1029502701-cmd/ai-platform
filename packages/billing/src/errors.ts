// ============================================
// Billing Core — 错误类型定义
// ============================================

export class BillingError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'BillingError';
  }
}

export class InsufficientCreditsError extends BillingError {
  constructor() {
    super('INSUFFICIENT_CREDITS', 'insufficient_credits');
    this.name = 'InsufficientCreditsError';
  }
}

export class DuplicateTransactionError extends BillingError {
  constructor(transactionId: string) {
    super('DUPLICATE_TRANSACTION', duplicate_transaction: );
    this.name = 'DuplicateTransactionError';
  }
}

export class WalletNotFoundError extends BillingError {
  constructor(userId: string) {
    super('WALLET_NOT_FOUND', wallet_not_found for user: );
    this.name = 'WalletNotFoundError';
  }
}

export class InvalidAmountError extends BillingError {
  constructor(amount: number) {
    super('INVALID_AMOUNT', invalid_amount: );
    this.name = 'InvalidAmountError';
  }
}

export class SubscriptionExpiredError extends BillingError {
  constructor(subscriptionId: string) {
    super('SUBSCRIPTION_EXPIRED', subscription expired: );
    this.name = 'SubscriptionExpiredError';
  }
}

export class PlanNotFoundError extends BillingError {
  constructor(planId: string) {
    super('PLAN_NOT_FOUND', plan_not_found: );
    this.name = 'PlanNotFoundError';
  }
}

export class FeatureCheckFailedError extends BillingError {
  constructor(featureKey: string) {
    super('FEATURE_CHECK_FAILED', eature check failed: );
    this.name = 'FeatureCheckFailedError';
  }
}
