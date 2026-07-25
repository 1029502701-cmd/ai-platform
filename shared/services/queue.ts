import { AIQueueService } from './ai_queue_service';

export async function enqueue(env: any, type: string, payload: any, options: any = {}) {
  const svc = new AIQueueService(env);
  return await svc.submitTask({ type, payload, priority: options.priority, created_by: options.created_by, max_retry: options.max_retry });
}
