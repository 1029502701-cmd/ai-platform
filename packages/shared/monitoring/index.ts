// ============================================
// Monitoring Package
// 错误追踪接口 — 未来对接 Sentry/Cloudflare Analytics
// ============================================

export type Severity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorEvent {
  message: string;
  stack?: string;
  code?: string;
  severity: Severity;
  userId?: string;
  requestId?: string;
  plugin?: string;
  duration?: number;
  context?: Record<string, unknown>;
  timestamp: string;
}

export interface TrackingResult {
  recorded: boolean;
  eventId?: string;
}

export interface ErrorTracker {
  track(event: ErrorEvent): Promise<TrackingResult>;
}

/** 空实现：静默丢弃 */
class NoopTracker implements ErrorTracker {
  async track(_event: ErrorEvent): Promise<TrackingResult> {
    return { recorded: false };
  }
}

export class Monitor {
  private tracker: ErrorTracker;

  constructor(tracker?: ErrorTracker) {
    this.tracker = tracker ?? new NoopTracker();
  }

  use(tracker: ErrorTracker): void {
    this.tracker = tracker;
  }

  async error(
    message: string,
    opts?: {
      code?: string;
      stack?: string;
      userId?: string;
      requestId?: string;
      plugin?: string;
      severity?: Severity;
      context?: Record<string, unknown>;
    },
  ): Promise<TrackingResult> {
    const event: ErrorEvent = {
      message,
      stack: opts?.stack,
      code: opts?.code,
      severity: opts?.severity ?? 'error',
      userId: opts?.userId,
      requestId: opts?.requestId,
      plugin: opts?.plugin,
      timestamp: new Date().toISOString(),
      context: opts?.context,
    };

    if (process.env.NODE_ENV === 'development') {
      console.error(`[Monitor] [${event.severity}] ${message}`, event);
    }

    return this.tracker.track(event);
  }

  async warning(message: string, opts?: Omit<Parameters<Monitor['error']>[1], 'severity'>): Promise<TrackingResult> {
    return this.error(message, { ...opts, severity: 'warning' as Severity });
  }

  async info(message: string, opts?: Omit<Parameters<Monitor['error']>[1], 'severity'>): Promise<TrackingResult> {
    return this.error(message, { ...opts, severity: 'info' as Severity });
  }

  async critical(message: string, opts?: Omit<Parameters<Monitor['error']>[1], 'severity'>): Promise<TrackingResult> {
    return this.error(message, { ...opts, severity: 'critical' as Severity });
  }

  fromApiError(error: unknown, opts?: {
    userId?: string;
    requestId?: string;
    plugin?: string;
  }): void {
    const message = error instanceof Error ? error.message : String(error);
    this.error(message, {
      ...opts,
      stack: error instanceof Error ? error.stack : undefined,
      code: error instanceof Error ? error.constructor.name : undefined,
    });
  }
}

export const monitor = new Monitor();
