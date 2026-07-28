import { D1Database } from '@cloudflare/workers-types';

export const EVENT_TYPES = {
  UPLOAD_START: 'upload_start',
  UPLOAD_SUCCESS: 'upload_success',
  UPLOAD_FAILED: 'upload_failed',
  ANALYSIS_START: 'analysis_start',
  ANALYSIS_SUCCESS: 'analysis_success',
  ANALYSIS_FAILED: 'analysis_failed',
  REPORT_VIEW: 'report_view',
  SHARE_CREATED: 'share_created',
} as const;

export class BeautyEventService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async trackEvent(userId: string | null | undefined, eventType: string, reportId?: string, metadata = {}) {
    try {
      const eventId = 'evt_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      await this.db.prepare(
        'INSERT INTO beauty_events (id, user_id, event_type, report_id, metadata_json) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        eventId,
        userId || null,
        eventType,
        reportId || null,
        JSON.stringify(metadata)
      ).run();
    } catch (error) {
      console.warn('Event tracking failed:', eventType);
    }
  }
}

export default BeautyEventService;
