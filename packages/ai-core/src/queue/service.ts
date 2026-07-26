// AI Queue Service - Business logic for task management

import { AIQueueRepository } from './repository';
import type { AITask, TaskPriority } from '../../types/queue';
import { v4 as uuidv4 } from 'uuid';

export class AIQueueService {
  protected repo: AIQueueRepository;
  protected env: any;

  constructor(env: any) {
    this.env = env;
    this.repo = new AIQueueRepository(env);
  }

  async submitTask(params: {
    type: string;
    payload?: any;
    priority?: TaskPriority;
    created_by?: string | null;
    max_retry?: number;
  }): Promise<string> {
    const id = uuidv4();
    const task: AITask = {
      id,
      type: params.type,
      status: 'pending',
      priority: params.priority || 'normal',
      payload: params.payload,
      retry_count: 0,
      max_retry: params.max_retry ?? 3,
      created_by: params.created_by,
      created_at: new Date().toISOString(),
    };
    await this.repo.createTask(task);
    return id;
  }

  async getTask(id: string): Promise<AITask | null> {
    return this.repo.getTaskById(id);
  }

  async fetchNextForWorker(workerId: string): Promise<AITask | null> {
    return this.repo.lockNextPending(workerId);
  }

  async markRunning(id: string, workerId: string): Promise<void> {
    await this.repo.markRunning(id, workerId);
  }

  async markSuccess(id: string, result: any): Promise<void> {
    await this.repo.markSuccess(id, result);
  }

  async markFailed(id: string, error: string, retryCount: number): Promise<void> {
    await this.repo.markFailed(id, error, retryCount);
  }

  async cancelTask(id: string): Promise<void> {
    await this.repo.cancelTask(id);
  }

  async getStats(): Promise<Record<string, number>> {
    return this.repo.getStats();
  }
}
