import { readSessionId } from '../../../../shared/auth/cookies.ts';
import { getSession, createSession } from '../../../../shared/auth/session.ts';
import { storeFile } from '../../../../shared/services/storage.ts';
import { updateUserProfile } from '../../../../shared/user/profile.ts';

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
    await context.env.DB.prepare(
      "INSERT INTO users (id, nickname, type, role, status, created_at, updated_at) VALUES (?, ?, 'guest', 'user', 'active', ?, ?)"
    ).bind(userId, nickname, now, now).run();
  } catch (_) {}
  var result = await createSession(context.env, { id: userId, email: '', role: 'user', status: 'active' });
  return result.session;
}

export const onRequestPost = async (context: any) => {
  try {
    const form = await context.request.formData();
    const file = form.get('file');
    if (!file) return errorResponse('NO_FILE', 'No file uploaded', 400);

    var contentType = file.type || '';
    if (!contentType || !contentType.startsWith('image/') || !ALLOWED_MIME.has(contentType)) {
      return errorResponse('INVALID_FILE_TYPE', 'Unsupported file type. Allowed: jpg, jpeg, png, webp', 400);
    }

    var size = file.size || 0;
    if (size > MAX_FILE_SIZE) return errorResponse('FILE_TOO_LARGE', 'File exceeds maximum size 10MB', 413);

    var filename = file.name || '';
    var extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    var ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

    if (!ALLOWED_EXT.has(ext)) {
      return errorResponse('INVALID_FILE_TYPE', 'Unsupported file extension', 400);
    }

    var fileId = crypto.randomUUID ? crypto.randomUUID() : 'f_' + Date.now().toString(36);
    var key = fileId + '.' + ext;

    var arrayBuffer = await file.arrayBuffer();
    var result = await storeFile(context.env, 'beauty-images', key, arrayBuffer, contentType);

    try {
      var session = await requireOrCreateGuest(context);
      if (context.env?.DB && session?.user?.id) {
        await updateUserProfile(context.env.DB, session.user.id, { imageUrl: result.url, lastAnalysisImage: result.url });
      }
    } catch (e) { console.warn('Failed to update user profile:', e); }

    return successResponse(result.url, key);
  } catch (e) {
    return errorResponse('UPLOAD_FAILED', (e as any)?.message || 'Upload failed', 500);
  }
};
