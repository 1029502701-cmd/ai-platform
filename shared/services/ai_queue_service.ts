import { AIQueueRepository } from './ai_queue_repository';
import type { AITask, TaskPriority } from '../types/ai_queue';
import { v4 as uuidv4 } from 'uuid';

export class AIQueueService {
  repo: AIQueueRepository;
  env: any;
  constructor(env: any) {
    this.env = env;
    this.repo = new AIQueueRepository(env);
  }

  async submitTask(params: {
    type: string;
    payload?: any;
    priority?: TaskPriority;
    created_by?: string;
    max_retry?: number;
  }) {
    const id = uuidv4();
    const task: AITask = {
      id,
      type: params.type,
      status: 'pending',
      priority: params.priority || 'normal',
      payload: params.payload,
      retry_count: 0,
      max_retry: params.max_retry ?? 3,
      created_by: params.created_by || null,
      created_at: new Date().toISOString()
    };
    await this.repo.createTask(task);
    return id;
  }

  async getTask(id: string) {
    return this.repo.getTaskById(id);
  }

  async cancelTask(id: string) {
    return this.repo.cancelTask(id);
  }

  async fetchNextForWorker(workerId: string) {
    // Claim next pending task
    return this.repo.lockNextPending(workerId);
  }

  async markRunning(id: string, workerId: string) {
    return this.repo.markRunning(id, workerId);
  }

  async markSuccess(id: string, result: any) {
    return this.repo.markSuccess(id, result);
  }

  async markFailed(id: string, error: string, retryCount: number) {
    return this.repo.markFailed(id, error, retryCount);
  }

  async reschedule(id: string, nextRunAt: string | null) {
    return this.repo.markPending(id, nextRunAt);
  }
}
