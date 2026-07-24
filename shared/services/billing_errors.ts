export class InsufficientCreditsError extends Error {
  constructor(message = 'insufficient_credits') { super(message); this.name = 'InsufficientCreditsError'; }
}
export class DuplicateTransactionError extends Error {
  constructor(message = 'duplicate_transaction') { super(message); this.name = 'DuplicateTransactionError'; }
}
export class WalletNotFoundError extends Error {
  constructor(message = 'wallet_not_found') { super(message); this.name = 'WalletNotFoundError'; }
}
