// ============================================
// Priority — 任务优先级路由与排序
// ============================================

import type { TaskPriority } from './types';
import { QueueRepository } from './repository';

/**
 * Priority ordering constant — higher number means higher priority.
 */
export const PRIORITY_SCORE: Record<TaskPriority, number> = {
  urgent: 4,
  high:   3,
  normal: 2,
  low:    1,
};

/**
 * Default priority assignment for different task types.
 * Business logic can override this.
 */
const DEFAULT_PRIORITY_MAP: Record<string, TaskPriority> = {
  'ai.generate':       'normal',
  'ai.chat':           'high',
  'beauty.analyze':    'normal',
  'face_analysis':     'high',
  'report_generation': 'low',
  'notification':      'high',
};

export class PriorityQueue {
  protected repo: QueueRepository;

  constructor(db: any) {
    this.repo = new QueueRepository(db);
  }

  /**
   * Get the effective priority for a task type.
   */
  static getEffectivePriority(taskType: string, userOverride?: TaskPriority): TaskPriority {
    if (userOverride) return userOverride;
    return DEFAULT_PRIORITY_MAP[taskType] || 'normal';
  }

  /**
   * List tasks grouped by priority level.
   */
  async listByPriority(limit: number = 50): Promise<Record<TaskPriority, any[]>> {
    const groups: Record<TaskPriority, any[]> = { urgent: [], high: [], normal: [], low: [] };
    const rows = await this.repo.listTasks({ limit });
    for (const row of rows) {
      const p = row.priority as TaskPriority;
      if (groups[p]) groups[p].push(row);
    }
    // Sort each group by creation time (FIFO within same priority)
    for (const key of Object.keys(groups) as TaskPriority[]) {
      groups[key].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return groups;
  }

  /**
   * Change priority of an existing task.
   */
  async updatePriority(taskId: string, newPriority: TaskPriority): Promise<void> {
    // Note: ai_tasks table doesn't have a separate priority column for UPDATE in some schemas
    // This is handled via a custom update in repository when needed.
    await this.repo.updateTaskPriority(taskId, newPriority);
  }

  /**
   * Calculate weighted total for SLA monitoring.
   * Formula: sum(score_i / total_count) gives a 1-4 average priority score.
   */
  async getWeightedAvgPriority(): Promise<{ avgScore: number; count: number }> {
    const all = await this.repo.listTasks({ limit: 10_000 });
    if (all.length === 0) return { avgScore: 0, count: 0 };
    const total = all.reduce((sum, t) => sum + PRIORITY_SCORE[t.priority], 0);
    return { avgScore: total / all.length, count: all.length };
  }
}

/** Factory */
export function createPriorityQueue(db: any): PriorityQueue {
  return new PriorityQueue(db);
}