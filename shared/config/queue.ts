const maybeProcess = (globalThis as any).process;
const env = maybeProcess && maybeProcess.env ? maybeProcess.env : (globalThis as any).ENV ? (globalThis as any).ENV : {};

export const QueueConfig = {
  MAX_QUEUE_WORKERS: parseInt(env.MAX_QUEUE_WORKERS || '4', 10),
  TASK_EXECUTION_TIMEOUT_MS: parseInt(env.TASK_EXECUTION_TIMEOUT_MS || (5 * 60 * 1000).toString(), 10), // default 5 minutes
  STALE_PENDING_MS: parseInt(env.STALE_PENDING_MS || (24 * 60 * 60 * 1000).toString(), 10), // 24h
  STALE_RUNNING_MS: parseInt(env.STALE_RUNNING_MS || (2 * 60 * 60 * 1000).toString(), 10) // 2h
};
