import { AIQueueService } from './ai_queue_service';
import { generateViaCore } from './ai_core';
import type { AITask } from '../types/ai_queue';
import { analyzeBeauty } from './plugins/beauty.service';
import { BillingService } from './billing.service';

export class AIQueueWorker {
  service: AIQueueService;
  env: any;
  workerId: string;
  pollingIntervalMs: number;
  running: boolean = false;

  constructor(env: any, workerId?: string, pollingIntervalMs = 2000) {
    this.env = env;
    this.workerId = workerId || `worker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    this.service = new AIQueueService(env);
    this.pollingIntervalMs = pollingIntervalMs;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    while (this.running) {
      try {
        const task = await this.service.fetchNextForWorker(this.workerId);
        if (!task) {
          await this.sleep(this.pollingIntervalMs);
          continue;
        }
        // Basic protection: if task is in an unexpected state, skip
        if (task.status !== 'pending') {
          console.warn(`[AIQueueWorker] skipping task ${task.id} in unexpected state ${task.status}`);
          await this.sleep(100);
          continue;
        }
        await this.handleTask(task);
      } catch (e: any) {
        // Log and continue
        try { console.error('[AIQueueWorker] loop error', e?.message || e); } catch {};
        await this.sleep(this.pollingIntervalMs);
      }
    }
  }

  stop() {
    this.running = false;
  }

  async handleTask(task: AITask) {
    // Mark running
    await this.service.markRunning(task.id, this.workerId);
    // Plugin-specific tasks
    try {
      if (task.type === 'beauty.analyze') {
        const payload = task.payload || {};
        const userId = typeof task.created_by === 'string' ? task.created_by : payload.userId;
        try {
          const { reportId, report } = await analyzeBeauty({ userContext: { mock: false, userProfile: payload.userProfile }, imageUrl: payload.imageUrl }, this.env);
          // persist results if DB available
          if (userId && this.env?.DB) {
            try {
              const db = this.env.DB;
              const now = new Date().toISOString();
              await db.prepare('INSERT OR REPLACE INTO beauty_reports (id, user_id, report_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(reportId, userId, JSON.stringify(report), now, now).run();
              const existing = await db.prepare('SELECT id, analysis_count FROM beauty_profiles WHERE user_id = ? LIMIT 1').bind(userId).first();
              if (existing) {
                await db.prepare('UPDATE beauty_profiles SET current_face_shape = ?, current_eye_shape = ?, analysis_count = COALESCE(analysis_count,0) + 1, last_analysis_id = ?, updated_at = ? WHERE user_id = ?')
                  .bind((report as any).faceShape?.shape || null, (report as any).faceAnalysis?.eyeShape || null, reportId, now, userId).run();
              } else {
                const profileId = 'bp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
                await db.prepare('INSERT INTO beauty_profiles (id, user_id, avatar_url, current_face_shape, current_eye_shape, skin_info, preferred_style, favorite_colors, analysis_count, last_analysis_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                  .bind(profileId, userId, null, (report as any).faceShape?.shape || null, (report as any).faceAnalysis?.eyeShape || null, null, (report as any).makeup?.base || null, null, 1, reportId, now, now).run();
              }
              const histId = 'bah_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
              await db.prepare('INSERT INTO beauty_analysis_history (id, user_id, report_id, image_url, face_analysis_json, style_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .bind(histId, userId, reportId, payload.imageUrl, (report as any).faceAnalysis ? JSON.stringify((report as any).faceAnalysis) : null, (report as any).makeup?.base || null, now).run();
            } catch (e: any) {
              console.warn('[AIQueueWorker][beauty] persistence failed', e?.message || e);
            }
          }

          // record a billing/usage entry (best-effort)
          try {
            if (userId && this.env?.DB) {
              const billingSvc = new BillingService(this.env.DB);
              try { await billingSvc.createUsage(userId, { user_id: userId, service: 'beauty.analysis', model: 'face_analysis', input_tokens: 0, output_tokens: 0, credits_used: 0, cost_usd: 0, status: 'completed' }); } catch (e) {}
            }
          } catch (e) {}

          await this.service.markSuccess(task.id, { reportId, report });
        } catch (e: any) {
          await this.onTaskFailure(task, e?.message || 'beauty_analysis_failed');
        }
        return;
      }
    } catch (e: any) {
      await this.onTaskFailure(task, e?.message || 'worker_error');
      return;
    }

    // Fallback: Execute via AI Core
    let result: any = null;
    try {
      // task.payload expected to be AIRequest-like
      const userId = typeof task.created_by === 'string' ? task.created_by : undefined;
      // Enforce execution timeout based on QueueConfig
      const { QueueConfig } = await import('./../config/queue');
      const execPromise = generateViaCore(this.env, { aiRequest: task.payload, userId });
      const timeoutMs = QueueConfig.TASK_EXECUTION_TIMEOUT_MS;
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('task_timeout')), timeoutMs));
      try {
        const coreRespRaw = await Promise.race([execPromise, timeoutPromise]);
        const coreResp: any = coreRespRaw as any;
        if (coreResp && coreResp.ok) {
          result = coreResp.data;
          await this.service.markSuccess(task.id, result);
        } else {
          const err = (coreResp && coreResp.error) ? coreResp.error : 'ai_core_error';
          await this.onTaskFailure(task, err);
        }
      } catch (err: any) {
        // timeout or other error
        const msg = err?.message || 'worker_error';
        await this.onTaskFailure(task, msg);
      }
    } catch (e: any) {
      await this.onTaskFailure(task, e?.message || 'worker_error');
    }
  }

  async onTaskFailure(task: AITask, errorMsg: string) {
    const currentRetry = task.retry_count ?? 0;
    const nextRetry = currentRetry + 1;
    if (nextRetry > (task.max_retry ?? 3)) {
      // mark failed permanently
      await this.service.markFailed(task.id, errorMsg, nextRetry);
    } else {
      // schedule retry with defined backoff strategy: 1st -> 10s, 2nd -> 30s, 3rd -> 5min
      let backoffMs = 10000; // default 10s
      if (nextRetry === 2) backoffMs = 30000;
      else if (nextRetry >= 3) backoffMs = 5 * 60 * 1000;
      const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
      // mark retry: update retry_count and next_retry_at and set status back to pending
      await this.service.markRetry(task.id, nextRetry, nextRetryAt);
      // record last error as failed attempt
      await this.service.markFailed(task.id, errorMsg, nextRetry);
    }
  }

  sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
}

