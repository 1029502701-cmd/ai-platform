/**
 * Real-time task statistics aggregator.
 */

interface TaskStats {
  totalCreated: number;
  totalCompleted: number;
  totalFailed: number;
  totalRetried: number;
  averageDurationMs: number;
  totalTokens: number;
  totalCostUsd: number;
  hourlyDistribution: Record<string, number>;
}

const stats: TaskStats = {
  totalCreated: 0,
  totalCompleted: 0,
  totalFailed: 0,
  totalRetried: 0,
  averageDurationMs: 0,
  totalTokens: 0,
  totalCostUsd: 0,
  hourlyDistribution: {},
};

export function trackTaskComplete(durationMs: number, tokens: number, costUsd: number, status: string, hour?: number): void {
  stats.totalCreated++;
  const h = String(hour || new Date().getHours()).padStart(2, '0');
  stats.hourlyDistribution[h] = (stats.hourlyDistribution[h] || 0) + 1;

  if (status === "completed") stats.totalCompleted++;
  if (status === "failed") stats.totalFailed++;
  if (status === "retrying") stats.totalRetried++;

  stats.totalTokens += tokens;
  stats.totalCostUsd += costUsd;
  stats.averageDurationMs = (stats.averageDurationMs * (stats.totalCompleted + stats.totalFailed) + durationMs) / (stats.totalCompleted + stats.totalFailed + 1);
}

export function getTaskStats(): TaskStats {
  return { ...stats };
}
