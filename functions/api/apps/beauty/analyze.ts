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

    // Attempt to read session & user profile before analysis so we can bias recommendations
    let session: any = null;
    let userProfile: any = null;
    try {
      const sessionId = readSessionId(context.request.headers.get('Cookie'));
      if (sessionId) {
        session = await getSession(context.env, sessionId);
        if (session && context.env?.DB) {
          try {
            userProfile = await context.env.DB.prepare('SELECT * FROM beauty_profiles WHERE user_id = ? LIMIT 1').bind(session.user.id).first();
          } catch (e) {
            userProfile = null;
          }
        }
      }
    } catch (e: any) {
      session = null;
      userProfile = null;
    }

    const { reportId, report } = await analyzeBeauty({ userContext: { mock: false, userProfile }, imageUrl });

    // Update user's last_analysis_image and persist profile/history if authenticated
    try {
      if (session && context.env?.DB) {
        const db = context.env.DB;
        const now = new Date().toISOString();
        // Persist the report and update profile/history in a transaction-like sequence
        try {
          await db.prepare('BEGIN').run();
        } catch (e: any) {
          // some environments may not support explicit transactions; proceed anyway
        }

        try {
          // insert or replace report
          await db.prepare('INSERT OR REPLACE INTO beauty_reports (id, user_id, report_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
            .bind(reportId, session.user.id, JSON.stringify(report), now, now)
            .run();

          // update or create profile
          const existing = await db.prepare('SELECT id, analysis_count FROM beauty_profiles WHERE user_id = ? LIMIT 1').bind(session.user.id).first();
          if (existing) {
            await db.prepare('UPDATE beauty_profiles SET current_face_shape = ?, current_eye_shape = ?, analysis_count = COALESCE(analysis_count,0) + 1, last_analysis_id = ?, updated_at = ? WHERE user_id = ?')
              .bind((report as any).faceShape?.shape || null, (report as any).faceAnalysis?.eyeShape || null, reportId, now, session.user.id).run();
          } else {
            const profileId = 'bp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
            await db.prepare('INSERT INTO beauty_profiles (id, user_id, avatar_url, current_face_shape, current_eye_shape, skin_info, preferred_style, favorite_colors, analysis_count, last_analysis_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind(profileId, session.user.id, null, (report as any).faceShape?.shape || null, (report as any).faceAnalysis?.eyeShape || null, null, (report as any).makeup?.base || null, null, 1, reportId, now, now).run();
          }

          // insert analysis history
          const histId = 'bah_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
          await db.prepare('INSERT INTO beauty_analysis_history (id, user_id, report_id, image_url, face_analysis_json, style_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(histId, session.user.id, reportId, imageUrl, (report as any).faceAnalysis ? JSON.stringify((report as any).faceAnalysis) : null, (report as any).makeup?.base || null, now).run();

          try { await db.prepare('COMMIT').run(); } catch (e: any) { /* ignore */ }
        } catch (e: any) {
          try { await db.prepare('ROLLBACK').run(); } catch (er: any) { /* ignore */ }
          console.warn('Failed to persist beauty data', (e as any)?.message || e);
        }

        // update user's shared profile image pointer as well
        try {
          await updateUserProfile(context.env.DB, session.user.id, { lastAnalysisImage: imageUrl });
        } catch (e: any) {
          console.warn('Failed to update last_analysis_image', (e as any)?.message || e);
        }
      }
    } catch (e: any) {
      console.warn('Failed to save beauty profile/history', (e as any)?.message || e);
    }

    return new Response(JSON.stringify({ success: true, data: { reportId, report } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message || '分析失败' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
