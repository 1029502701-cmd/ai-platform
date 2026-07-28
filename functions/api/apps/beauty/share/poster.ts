import { readSessionId } from '../../../../../shared/auth/cookies.ts';
import { getSession } from '../../../../../shared/auth/session.ts';
import { getBeautyEventService } from '../../../../../shared/services/beauty/BeautyEventService';

export const onRequestPost = async (context: any) => {
  let userId: string | null = null;
  try {
    const sessionId = readSessionId(context.request.headers.get('Cookie'));
    if (sessionId) {
      const session = await getSession(context.env, sessionId);
      if (session && session.user?.id) userId = session.user.id;
    }
  } catch (e) {}

  const eventService = getBeautyEventService(context.env?.DB);
  let reportIdFromRequest: string | null = null;

  try {
    const text = await context.request.text();
    const body = text ? JSON.parse(text) : {};
    const reportId = body?.reportId;
    if (!reportId || typeof reportId !== 'string') {
      if (eventService && context.env?.DB) {
        eventService.trackEvent(userId, 'SHARE_CREATED', null, { error: 'MISSING_REPORT_ID' }).catch(() => {});
      }
      return new Response(JSON.stringify({ success: false, error: { code: 'MISSING_REPORT_ID', message: 'reportId is required' } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    reportIdFromRequest = reportId;

    if (eventService && context.env?.DB) {
      eventService.trackEvent(userId, 'SHARE_CREATED', reportId, { intent: 'generate_poster' }).catch(() => {});
    }

    const userKey = body?.imageKey || 'beauty/images/anonymous/' + Date.now() + '.png';
    const contentType = 'image/png';
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9kq1XQAAAABJRU5ErkJgg==';
    const buffer = Buffer.from(b64, 'base64');

    var fileId = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : 'poster_' + Date.now().toString(36);
    var key = userKey.replace(/\.png$/, '') + '-poster.png';

    var bucket = context.env?.ASSETS_BUCKET;
    if (!bucket || typeof bucket.put !== 'function') {
      if (eventService && context.env?.DB) {
        eventService.trackEvent(userId, 'SHARE_CREATED', reportId, { error: 'NO_R2_BUCKET' }).catch(() => {});
      }
      return new Response(JSON.stringify({ success: false, error: { code: 'NO_R2_BUCKET', message: 'R2 bucket not configured' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    await bucket.put(key, buffer as any, { httpMetadata: { contentType: contentType || undefined } });

    var imageUrl = '/api/apps/beauty/image?key=' + encodeURIComponent(key);

    try {
      if (context.env?.DB) {
        await context.env.DB.run('UPDATE beauty_reports SET share_image_url = ? WHERE id = ?', [imageUrl, reportId]);
      }
    } catch (e) { console.warn('Failed to update share image URL:', e); }

    if (eventService && context.env?.DB) {
      eventService.trackEvent(userId, 'SHARE_CREATED', reportId, { success: true, posterKey: key }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, data: { imageUrl, key } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch (e: any) {
    if (eventService && context.env?.DB && reportIdFromRequest) {
      eventService.trackEvent(userId, 'SHARE_CREATED', reportIdFromRequest, { error: (e as any)?.message }).catch(() => {});
    }
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message || 'Poster generation failed' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
