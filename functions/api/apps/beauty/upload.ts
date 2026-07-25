import { readSessionId } from "../../../../shared/auth/cookies";
import { getSession } from "../../../../shared/auth/session";
import { storeFile } from '../../../../shared/services/storage';
import { updateUserProfile } from '../../../../shared/user/profile';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

function successResponse(imageUrl: string, fileKey: string) {
  return new Response(JSON.stringify({ success: true, imageUrl, fileKey }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function errorResponse(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function requireUser(context: any) {
  const sessionId = readSessionId(context.request.headers.get('Cookie'));
  if (!sessionId) return null;
  return getSession(context.env, sessionId);
}

export const onRequestPost = async (context: any) => {
  try {
    const form = await context.request.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return errorResponse('NO_FILE', 'No file uploaded (field name must be "file")', 400);
    }

    const contentType = (file as any).type || '';
    if (!contentType || !contentType.startsWith('image/') || !ALLOWED_MIME.has(contentType)) {
      return errorResponse('INVALID_FILE_TYPE', 'Unsupported file type', 400);
    }

    const size = (file as any).size || 0;
    if (size > MAX_FILE_SIZE) {
      return errorResponse('FILE_TOO_LARGE', 'File exceeds maximum size 10MB', 413);
    }

    const filename = (file as any).name || '';
    const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : (contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg');

    if (!ALLOWED_EXT.has(ext)) {
      return errorResponse('INVALID_FILE_TYPE', 'Unsupported file extension', 400);
    }

    // Ensure mime and extension are consistent
    if ((contentType === 'image/jpeg' && ext !== 'jpg' && ext !== 'jpeg') ||
        (contentType === 'image/png' && ext !== 'png') ||
        (contentType === 'image/webp' && ext !== 'webp')) {
      return errorResponse('INVALID_FILE_TYPE', 'File extension does not match MIME type', 400);
    }

    const fileId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : 'f_' + Date.now().toString(36);
    const key = `${fileId}.${ext}`;

    const arrayBuffer = await (file as any).arrayBuffer();

    const result = await storeFile(context.env, 'beauty-images', key, arrayBuffer, contentType);

    // Associate with user profile if authenticated
    try {
      const session = await requireUser(context);
      if (session && context.env?.DB) {
        await updateUserProfile(context.env.DB, session.user.id, { imageUrl: result.url, lastAnalysisImage: result.url });
      }
    } catch (e) {
      // Non-fatal
      console.warn('Failed to update user profile with image url', e);
    }

    return successResponse(result.url, key);
  } catch (e: any) {
    return errorResponse('UPLOAD_FAILED', e?.message || 'Upload failed', 500);
  }
};
