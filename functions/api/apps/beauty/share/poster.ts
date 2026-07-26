import { updateUserProfile } from '../../../../../shared/user/profile.ts';

export const onRequestPost = async (context: any) => {
  try {
    const text = await context.request.text();
    const body = text ? JSON.parse(text) : {};
    const reportId = body?.reportId;
    if (!reportId || typeof reportId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: { code: 'MISSING_REPORT_ID', message: 'reportId is required' } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    // Read image key from request or use a default placeholder
    const userKey = body?.imageKey || 'beauty/images/anonymous/default/' + Date.now() + '.png';
    const contentType = 'image/png';

    // Use a small transparent PNG as placeholder for now; real implementation would render canvas
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9kq1XQAAAABJRU5ErkJgg==';
    const buffer = Buffer.from(b64, 'base64');

    var fileId = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : 'poster_' + Date.now().toString(36);
    var key = userKey.replace(/\.png$/, '') + '-poster.png';

    // Write to ASSETS_BUCKET directly
    var bucket = context.env?.ASSETS_BUCKET;
    if (!bucket || typeof bucket.put !== 'function') {
      return new Response(JSON.stringify({ success: false, error: { code: 'NO_R2_BUCKET', message: 'R2 bucket not configured' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    await bucket.put(key, buffer as any, { httpMetadata: { contentType: contentType || undefined } });

    var imageUrl = '/api/apps/beauty/image?key=' + encodeURIComponent(key);

    try {
      if (context.env?.DB) {
        await context.env.DB.run('UPDATE beauty_reports SET share_image_url = ? WHERE id = ?', [imageUrl, reportId]);
      }
    } catch (e) { console.warn('Failed to update share image URL:', e); }

    return new Response(JSON.stringify({ success: true, data: { imageUrl, key } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message || 'Poster generation failed' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
