/**
 * Enhanced Queue Scheduler with priority, concurrency control, DLQ, and stats.
 */

export interface TaskPriority {
  vip: number;    // 100
  premium: number; // 75
  standard: number; // 50
  guest: number;    // 25
}

const PRIORITIES: TaskPriority = {
  vip: 100,
  premium: 75,
  standard: 50,
  guest: 25,
};

// In-memory priority queue
interface QueuedTask {
  id: string;
  priority: number;
  createdAt: number;
  payload: any;
}

const mainQueue: QueuedTask[] = [];
const dlq: QueuedTask[] = [];

let concurrency = 4;
let activeTasks = 0;

export function setConcurrency(n: number): void {
  concurrency = Math.max(1, Math.min(n, 50));
}

export function addTask(taskId: string, priority: string, payload: any): void {
  const p = PRIORITIES[priority as keyof TaskPriority] || PRIORITIES.standard;
  mainQueue.push({ id: taskId, priority: p, createdAt: Date.now(), payload });
  mainQueue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
}

export function getNextTask(): QueuedTask | null {
  if (activeTasks >= concurrency) return null;
  if (mainQueue.length === 0) return null;
  activeTasks++;
  return mainQueue.shift() || null;
}

export function completeTask(): void {
  activeTasks = Math.max(0, activeTasks - 1);
}

export function moveToDLQ(task: QueuedTask): void {
  dlq.push(task);
  completeTask();
}

export function getStats(): { pending: number; dlqSize: number; active: number; concurrency: number } {
  return {
    pending: mainQueue.length,
    dlqSize: dlq.length,
    active: activeTasks,
    concurrency,
  };
}

export function clearDLQ(): void { dlq.length = 0; }
