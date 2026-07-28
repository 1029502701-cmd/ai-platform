import { readSessionId } from '../../../../shared/auth/cookies.ts';
import { getSession, createSession } from '../../../../shared/auth/session.ts';
import { updateUserProfile } from '../../../../shared/user/profile.ts';
import { getBeautyEventService } from '../../../../shared/services/beauty/BeautyEventService';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

function successResponse(imageUrl: string, fileId: string) {
  return new Response(JSON.stringify({ success: true, data: { imageUrl, fileId } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function errorResponse(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function requireOrCreateGuest(context: any) {
  const sessionId = readSessionId(context.request.headers.get('Cookie'));
  if (sessionId) {
    const session = await getSession(context.env, sessionId);
    if (session && session.user?.id) return session;
  }
  const userId = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  const nickname = 'Guest-' + userId.slice(-6);
  const now = new Date().toISOString();
  try {
    await context.env.db.prepare('INSERT INTO users (id, nickname, type, role, status, created_at, updated_at) VALUES (?, ?, \'guest\', \'user\', \'active\', ?, ?)').bind(userId, nickname, now, now).run();
  } catch (_) {}
  const result = await createSession(context.env, { id: userId, email: '', role: 'user', status: 'active' });
  return result.session;
}

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
  if (eventService && context.env?.DB) {
    eventService.trackEvent(userId, 'UPLOAD_START', undefined, { source: 'api' }).catch(() => {});
  }

  try {
    const form = await context.request.formData();
    const file = form.get('file');
    if (!file) {
      if (eventService && context.env?.DB) eventService.trackEvent(userId, 'UPLOAD_FAILED', undefined, { error: 'NO_FILE' }).catch(() => {});
      return errorResponse('NO_FILE', 'No file uploaded', 400);
    }

    var contentType = file.type || '';
    if (!contentType || !contentType.startsWith('image/') || !ALLOWED_MIME.has(contentType)) {
      if (eventService && context.env?.DB) eventService.trackEvent(userId, 'UPLOAD_FAILED', undefined, { error: 'INVALID_FILE_TYPE' }).catch(() => {});
      return errorResponse('INVALID_FILE_TYPE', 'Unsupported file type', 400);
    }

    var size = file.size || 0;
    if (size > MAX_FILE_SIZE) {
      if (eventService && context.env?.DB) eventService.trackEvent(userId, 'UPLOAD_FAILED', undefined, { error: 'FILE_TOO_LARGE' }).catch(() => {});
      return errorResponse('FILE_TOO_LARGE', 'File exceeds 10MB', 413);
    }

    var filename = file.name || '';
    var extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    var ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    if (!ALLOWED_EXT.has(ext)) {
      if (eventService && context.env?.DB) eventService.trackEvent(userId, 'UPLOAD_FAILED', undefined, { error: 'INVALID_EXT' }).catch(() => {});
      return errorResponse('INVALID_FILE_TYPE', 'Unsupported extension', 400);
    }

    var session = await requireOrCreateGuest(context);
    userId = session?.user?.id || 'anonymous';
    var fileId = crypto.randomUUID ? crypto.randomUUID() : 'f_' + Date.now().toString(36);
    var key = 'beauty/images/' + userId + '/' + fileId + '.' + ext;
    var arrayBuffer = await file.arrayBuffer();
    var bucket = context.env?.ASSETS_BUCKET;
    if (!bucket || typeof bucket.put !== 'function') {
      if (eventService && context.env?.DB) eventService.trackEvent(userId, 'UPLOAD_FAILED', undefined, { error: 'NO_R2' }).catch(() => {});
      return errorResponse('NO_R2_BUCKET', 'R2 not configured', 500);
    }
    await bucket.put(key, arrayBuffer as any, { httpMetadata: { contentType: contentType || undefined } });
    var imageUrl = '/api/apps/beauty/image?key=' + encodeURIComponent(key);

    try {
      if (context.env?.DB && userId) {
        await updateUserProfile(context.env.DB, userId, { imageUrl, lastAnalysisImage: imageUrl });
      }
    } catch (e) { console.warn('Profile update failed:', e); }

    if (eventService && context.env?.DB) {
      eventService.trackEvent(userId, 'UPLOAD_SUCCESS', undefined, { fileKey: key, fileSize: size }).catch(() => {});
    }

    return successResponse(imageUrl, key);
  } catch (e) {
    if (eventService && context.env?.DB) {
      eventService.trackEvent(userId, 'UPLOAD_FAILED', undefined, { error: (e as any)?.message || 'UNKNOWN' }).catch(() => {});
    }
    return errorResponse('UPLOAD_FAILED', (e as any)?.message || 'Upload failed', 500);
  }
};

