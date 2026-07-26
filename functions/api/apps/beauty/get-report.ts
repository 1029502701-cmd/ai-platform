import { readSessionId } from '../../../../shared/auth/cookies.ts';
import { getSession } from '../../../../shared/auth/session.ts';

export const onRequestGet = async (context: any) => {
  try {
    const { params } = context;
    const reportId = params?.id;
    if (!reportId || typeof reportId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: { code: 'MISSING_REPORT_ID', message: 'Report ID is required' } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const db = context.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: { code: 'NO_DB', message: 'Database not available' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    // Public share links bypass auth — check if this is a shared report lookup first
    const url = new URL(context.request.url);
    const shareMode = url.searchParams.get('share') === '1';

    if (shareMode) {
      // Shared report access — no auth required, just public reports
      const row = await db.prepare(
        'SELECT id, user_id, report_json, share_image_url, created_at FROM beauty_reports WHERE id = ?'
      ).bind(reportId).first();

      if (!row) {
        return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } }), { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }

      let reportData: any = null;
      try { reportData = JSON.parse(row.report_json || '{}'); } catch (e) {}

      return new Response(JSON.stringify({ success: true, data: { reportId: row.id, report: reportData, shareImageUrl: row.share_image_url } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    // Normal mode — requires session to read own report
    const sessionId = readSessionId(context.request.headers.get('Cookie'));
    const session = sessionId ? await getSession(context.env, sessionId) : null;
    if (!session || !session.user?.id) {
      return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }), { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const row = await db.prepare(
      'SELECT id, user_id, report_json, share_image_url, created_at FROM beauty_reports WHERE id = ? AND user_id = ?'
    ).bind(reportId, session.user.id).first();

    if (!row) {
      return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found or access denied' } }), { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    let reportData: any = null;
    try { reportData = JSON.parse(row.report_json || '{}'); } catch (e) {}

    return new Response(JSON.stringify({ success: true, data: { reportId: row.id, report: reportData, createdAt: row.created_at, shareImageUrl: row.share_image_url } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message || 'Server error' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
