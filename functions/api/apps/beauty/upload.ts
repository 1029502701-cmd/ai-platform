import { readSessionId } from "../../../../shared/auth/cookies";
import { getSession } from "../../../../shared/auth/session";
import { storeFile } from '../../../../shared/services/storage';
import { updateUserProfile } from '../../../../shared/user/profile';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function jsonResponse(data: unknown, status: number): Response {
  const success = status < 400;
  return new Response(
    JSON.stringify({ success, data: success ? data : null, error: success ? null : data, meta: {} }),
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}

async function requireUser(context: any) {
  const sessionId = readSessionId(context.request.headers.get('Cookie'));
  if (!sessionId) return null;
  return getSession(context.env, sessionId);
}

export const onRequestPost = async (context: any) => {
  try {
    // Parse multipart/form-data
    const form = await context.request.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return jsonResponse({ code: 'NO_FILE', message: 'No file uploaded (field name must be "file")' }, 400);
    }

    // Validate type
    const contentType = (file as any).type || '';
    if (!ALLOWED_TYPES.has(contentType)) {
      return jsonResponse({ code: 'INVALID_FILE_TYPE', message: 'Unsupported file type' }, 400);
    }

    // Validate size
    const size = (file as any).size || 0;
    if (size > MAX_FILE_SIZE) {
      return jsonResponse({ code: 'FILE_TOO_LARGE', message: 'File exceeds maximum size 5MB' }, 413);
    }

    // Determine extension
    const filename = (file as any).name || '';
    const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    let ext = extMatch ? extMatch[1].toLowerCase() : (contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg');

    const fileId = crypto.randomUUID ? crypto.randomUUID() : 'f_' + Date.now().toString(36);
    const key = `${fileId}.${ext}`;

    const arrayBuffer = await (file as any).arrayBuffer();

    // Store in R2 or local emulator (storeFile will accept ArrayBuffer or Buffer)
    const result = await storeFile(context.env, 'beauty-images', key, arrayBuffer, contentType);

    // Associate with user profile if authenticated
    try {
      const session = await requireUser(context);
      if (session && context.env?.DB) {
        await updateUserProfile(context.env.DB, session.user.id, { imageUrl: result.url });
      }
    } catch (e) {
      // Non-fatal - log and continue
      console.warn('Failed to update user profile with image url', e);
    }

    return jsonResponse({ imageUrl: result.url, fileId }, 200);
  } catch (e: any) {
    return jsonResponse({ code: 'UPLOAD_FAILED', message: e?.message || 'Upload failed' }, 500);
  }
};
