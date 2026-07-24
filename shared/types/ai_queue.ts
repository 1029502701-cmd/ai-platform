export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'archived';
export type TaskPriority = 'high' | 'normal' | 'low';

export interface AITask {
  id: string;
  type: string;
  status: TaskStatus;
  priority: TaskPriority;
  payload?: any; // JSON-serializable
  result?: any;
  retry_count?: number;
  max_retry?: number;
  next_run_at?: string | null;
  next_retry_at?: string | null;
  locked_by?: string | null;
  locked_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  last_error?: string | null;
}
