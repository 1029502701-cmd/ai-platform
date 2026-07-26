// ============================================
// Queue Core — All Types
// ============================================

export type TaskStatus = 'pending' | 'queued' | 'running' | 'retrying' | 'success' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskType = string;

/** Internal task entity stored in ai_tasks */
export interface AITask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  userId: string | null;        // bound to user (Auth integration)
  payload: any | null;          // JSON-serializable execution data
  result: any | null;           // output after success
  retryCount: number;
  maxRetry: number;
  lockedBy: string | null;      // workerId currently processing
  lockedAt: string | null;
  nextRunAt: string | null;     // scheduled time for delayed tasks
  createdById: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
}

/** Public input to queue.add() */
export interface EnqueueParams {
  type: TaskType;
  payload?: Record<string, unknown>;
  priority?: TaskPriority;
  userId: string | null;
  maxRetry?: number;
  scheduleAfter?: number;     // ms to wait before becoming available
}

/** Internal handler that executes one task */
export interface TaskHandler {
  execute(task: AITask): Promise<{ success: boolean; data?: unknown; error?: string }>;
}

/** Configuration for a worker instance */
export interface WorkerConfig {
  workerId: string;
  pollingIntervalMs: number;
  maxConcurrentTasks: number;
  timeoutMs: number;
}

/** Retry / backoff configuration */
export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  backoffBaseMs: number;       // initial delay = baseMs * factor ^ attempt
  backoffFactor: number;
  maxBackoffMs: number;        // cap on any single backoff
  jitter: boolean;             // add random variance
}

/** Queue-wide statistics */
export interface QueueStats {
  total: number;
  pending: number;
  queued: number;
  running: number;
  retrying: number;
  success: number;
  failed: number;
  cancelled: number;
}

/** Stale task discovered during cleanup */
export interface StaleTask {
  id: string;
  type: TaskType;
  lockedBy: string | null;
  lockedAt: string | null;
  startedAt: string | null;
  staleReason: 'stale_pending' | 'stale_running';
}

/** Result of a dequeue/claim operation */
export interface ClaimedTask {
  task: AITask;
  workerId: string;
}

/** Producer enqueue result */
export interface EnqueueResult {
  taskId: string;
  status: 'queued';
}

/** Consumer poll result */
export interface PollResult {
  found: boolean;
  task?: AITask;
  workerId?: string;
}

/** Scheduler tick return — scheduled tasks that are now due */
export interface ScheduleTickResult {
  dueCount: number;
  pendingCount: number;
}