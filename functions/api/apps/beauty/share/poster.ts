import { storeFile } from '../../../../../shared/services/storage';

export const onRequestPost = async (context: any) => {
  try {
    const text = await context.request.text();
    const body = text ? JSON.parse(text) : {};
    const reportId = body?.reportId;
    if (!reportId || typeof reportId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: { code: 'MISSING_REPORT_ID', message: 'reportId is required' } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9kq1XQAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(b64, 'base64');

    const fileId = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : 'poster_' + Date.now().toString(36);
    const key = fileId + '.png';
    const result = await storeFile(context.env, 'beauty-share-images', key, buffer, 'image/png');

    try {
      if (context.env?.DB) {
        await context.env.DB.run('UPDATE beauty_reports SET share_image_url = ? WHERE id = ?', [result.url, reportId]);
      }
    } catch (e) { console.warn('Failed to update share image URL:', e); }

    return new Response(JSON.stringify({ success: true, data: { imageUrl: result.url } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message || 'Poster generation failed' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
