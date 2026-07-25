import { analyzeBeauty } from '../../../../shared/services/plugins/beauty.service';
import { readSessionId } from "../../../../shared/auth/cookies";
import { getSession } from "../../../../shared/auth/session";
import { updateUserProfile } from '../../../../shared/user/profile';

export const onRequestPost = async (context: any) => {
  try {
    const text = await context.request.text();
    const body = text ? JSON.parse(text) : {};

    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ success: false, error: { code: 'INVALID_BODY', message: 'Request body must be JSON with imageUrl' } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const imageUrl = body.imageUrl;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(JSON.stringify({ success: false, error: { code: 'MISSING_IMAGE_URL', message: 'imageUrl is required and must be a string' } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const { reportId, report } = await analyzeBeauty({ userContext: { mock: false }, imageUrl });

    // Update user's last_analysis_image if authenticated
    try {
      const sessionId = readSessionId(context.request.headers.get('Cookie'));
      if (sessionId) {
        const session = await getSession(context.env, sessionId);
        if (session && context.env?.DB) {
          await updateUserProfile(context.env.DB, session.user.id, { lastAnalysisImage: imageUrl });
        }
      }
    } catch (e: any) {
      console.warn('Failed to update last_analysis_image', e?.message || e);
    }

    return new Response(JSON.stringify({ success: true, data: { reportId, report } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message || '分析失败' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
