import { AIQueueRepository } from './ai_queue_repository';

export class AdminTaskService {
  repo: AIQueueRepository;
  env: any;
  constructor(env: any) { this.env = env; this.repo = new AIQueueRepository(env); }

  async listTasks(filters: { status?: string; taskType?: string; userId?: string } = {}, limit = 50) {
    const f: any = {};
    if (filters.status) f.status = filters.status;
    if (filters.taskType) f.type = filters.taskType;
    if (filters.userId) f.userId = filters.userId;
    return this.repo.listTasksWithFilters(f, limit);
  }

  async getTaskDetail(id: string) {
    return this.repo.getTaskById(id);
  }

  async getStats() {
    return this.repo.getStats();
  }
}
