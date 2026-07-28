import { readSessionId } from '../../../../shared/auth/cookies.ts';
import { getSession } from '../../../../shared/auth/session.ts';
import { getBeautyEventService } from '../../../../shared/services/beauty/BeautyEventService';

export const onRequestGet = async (context: any) => {
  let userId: string | null = null;
  let reportId: string | null = null;
  let isShareMode = false;

  try {
    const { params } = context;
    reportId = params?.id as string || null;
    if (!reportId || typeof reportId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: { code: 'MISSING_REPORT_ID', message: 'Report ID is required' } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const db = context.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: { code: 'NO_DB', message: 'Database not available' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    // Check share mode first
    const url = new URL(context.request.url);
    isShareMode = url.searchParams.get('share') === '1';

    let sessionId: string | null = null;
    if (!isShareMode) {
      sessionId = readSessionId(context.request.headers.get('Cookie'));
      if (sessionId) {
        const session = await getSession(context.env, sessionId);
        if (session && session.user?.id) {
          userId = session.user.id;
        }
      }
    }

    // Track the view attempt (with user ID if available)
    const eventService = getBeautyEventService(db);
    if (eventService && db) {
      eventService.trackEvent(userId, 'REPORT_VIEW', reportId, { shareMode: isShareMode }).catch(() => {});
    }

    if (isShareMode) {
      // Shared report access ¡ª no auth required
      const row = await db.prepare('SELECT id, user_id, report_json, share_image_url, created_at FROM beauty_reports WHERE id = ?').bind(reportId).first();
      if (!row) {
        return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } }), { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }

      let reportData: any = null;
      try { reportData = JSON.parse(row.report_json || '{}'); } catch (e) {}

      return new Response(JSON.stringify({ success: true, data: { reportId: row.id, report: reportData, shareImageUrl: row.share_image_url } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    // Normal mode ¡ª requires session to read own report
    const row = await db.prepare('SELECT id, user_id, report_json, share_image_url, created_at FROM beauty_reports WHERE id = ? AND user_id = ?').bind(reportId, userId!).first();
    if (!row) {
      return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found or access denied' } }), { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    let reportData: any = null;
    try { reportData = JSON.parse(row.report_json || '{}'); } catch (e) {}

    return new Response(JSON.stringify({ success: true, data: { reportId: row.id, report: reportData, createdAt: row.created_at, shareImageUrl: row.share_image_url } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch (e: any) {
    // If we have a userId from earlier, log the event failure too
    if (userId && context.env?.DB) {
      getBeautyEventService(context.env?.DB)?.trackEvent(userId, 'REPORT_VIEW', reportId || 'unknown', { error: (e as any)?.message }).catch(() => {});
    }
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message || 'Server error' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};

