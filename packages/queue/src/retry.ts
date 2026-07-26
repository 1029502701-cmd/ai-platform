// ============================================
// Retry — 统一重试与指数退避策略
// ============================================

import type { RetryConfig } from './types';
import { QueueRepository } from './repository';

export class RetryEngine {
  protected repo: QueueRepository;
  protected config: Required<RetryConfig>;

  constructor(db: any, config?: Partial<RetryConfig>) {
    this.repo = new QueueRepository(db);
    this.config = {
      enabled: config?.enabled ?? true,
      maxAttempts: config?.maxAttempts ?? 3,
      backoffBaseMs: config?.backoffBaseMs ?? 10_000,
      backoffFactor: config?.backoffFactor ?? 2,
      maxBackoffMs: config?.maxBackoffMs ?? 300_000,
      jitter: config?.jitter ?? true,
    };
  }

  /**
   * Determine next retry action for a failed task.
   * Returns { shouldRetry: boolean, nextRunAt: string | null }
   */
  decideNextRetry(taskRetryCount: number): { shouldRetry: boolean; nextRunAt: string | null } {
    if (!this.config.enabled) return { shouldRetry: false, nextRunAt: null };
    if (taskRetryCount >= this.config.maxAttempts) return { shouldRetry: false, nextRunAt: null };

    const delay = this.calculateBackoff(taskRetryCount);
    const nextRunAt = new Date(Date.now() + delay).toISOString();
    return { shouldRetry: true, nextRunAt };
  }

  /**
   * Apply the retry decision: mark task as retrying with the calculated next_run_at.
   */
  async scheduleRetry(taskId: string, currentRetryCount: number): Promise<{ success: boolean; nextRunAt?: string }> {
    const decision = this.decideNextRetry(currentRetryCount);
    if (!decision.shouldRetry) {
      return { success: false };
    }
    await this.repo.markRetry(taskId, currentRetryCount + 1, decision.nextRunAt);
    return { success: true, nextRunAt: decision.nextRunAt };
  }

  /**
   * Manually retry a task — override automatic scheduling.
   */
  async manualRetry(taskId: string, delayMs: number): Promise<{ success: boolean; nextRunAt: string }> {
    const nextRunAt = new Date(Date.now() + delayMs).toISOString();
    await this.repo.markRetry(taskId, 0, nextRunAt);
    return { success: true, nextRunAt };
  }

  /**
   * Calculate exponential backoff delay with optional jitter.
   * Formula: min(baseMs * factor^attempt, maxBackoffMs) +/- jitter%
   */
  calculateBackoff(attempt: number): number {
    let delay = this.config.backoffBaseMs * Math.pow(this.config.backoffFactor, attempt - 1);
    delay = Math.min(delay, this.config.maxBackoffMs);

    if (this.config.jitter) {
      // +-10% random variance
      const variance = delay * 0.1;
      delay += (Math.random() * 2 - 1) * variance;
    }

    return Math.max(1000, Math.round(delay)); // floor 1s
  }
}

/** Factory */
export function createRetryEngine(db: any, config?: Partial<RetryConfig>): RetryEngine {
  return new RetryEngine(db, config);
}