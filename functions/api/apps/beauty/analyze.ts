import { analyzeBeauty } from '../../../../shared/services/plugins/beauty.service.ts';
import { readSessionId } from '../../../../shared/auth/cookies.ts';
import { getSession } from '../../../../shared/auth/session.ts';
import { checkAndConsumeLimit } from '../../../../shared/auth/usage.ts';
import { BillingService } from '../../../../shared/services/billing.service.ts';
import { updateUserProfile } from '../../../../shared/user/profile.ts';

// Extract R2 key from image URL (/api/apps/beauty/image?key=beauty/images/... or full URL)
function extractImageKey(url: string): string | null {
  try {
    const parsed = new URL(url, 'http://localhost');
    const key = parsed.searchParams.get('key');
    if (key) return decodeURIComponent(key);
  } catch {}
  return null;
}

export const onRequestPost = async (context: any) => {
  try {
    const text = await context.request.text();
    const body = text ? JSON.parse(text) : {};

    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ success: false, error: { code: 'INVALID_BODY', message: 'Request body must be JSON with imageUrl and faceAnalysis' } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const imageUrl = body.imageUrl;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(JSON.stringify({ success: false, error: { code: 'MISSING_IMAGE_URL', message: 'imageUrl is required (from upload endpoint)' } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    // Face analysis data from browser MediaPipe
    const faceAnalysis = body.faceAnalysis;

    // ── Auth & Usage Check ──────────────────────────────────────────────
    let session: any = null;
    let userId: string | null = null;
    let userProfile: any = null;
    let isGuest = true;

    try {
      const sessionId = readSessionId(context.request.headers.get('Cookie'));
      if (sessionId) {
        session = await getSession(context.env, sessionId);
        if (session && session.user?.id && context.env?.DB) {
          userId = session.user.id;
          isGuest = false;

          try {
            userProfile = await context.env.DB.prepare(
              'SELECT * FROM beauty_profiles WHERE user_id = ? LIMIT 1'
            ).bind(userId).first();
          } catch (e) { /* table may not exist yet */ }

          const limitCheck = await checkAndConsumeLimit(context.env.DB, userId!);
          if (!limitCheck.ok) {
            return new Response(JSON.stringify({ success: false, error: { code: 'DAILY_LIMIT_EXCEEDED', message: 'Free analysis limit reached for today. Upgrade your plan for unlimited analyses.' } }), { status: 429, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
          }
        }
      }
    } catch (e: any) {
      console.warn('[Beauty] Auth failed:', e.message);
      isGuest = true;
    }

    if (!userId) {
      userId = 'guest_' + Date.now().toString(36);
    }

    // ── Run Beauty Analysis ─────────────────────────────────────────────
    const userContext = isGuest ? {} : (userProfile ? { userProfile } : {});
    const { reportId, report } = await analyzeBeauty(
      { userContext, imageUrl, faceAnalysis },
      context.env,
    );

    // ── Record Usage / Billing ──────────────────────────────────────────
    if (context.env?.DB) {
      const billingSvc = new BillingService(context.env.DB);
      try {
        await billingSvc.createUsage(userId!, {
          user_id: userId!,
          service: 'beauty_analysis',
          model: 'face_analysis',
          input_tokens: 0,
          output_tokens: 0,
          credits_used: 0,
          cost_usd: 0,
          status: 'completed',
        });
      } catch (e) { console.warn('[Beauty] Billing record failed:', e); }
    }

    // ── Save to D1 (logged-in users only) ───────────────────────────────
    if (context.env?.DB && !isGuest && userId) {
      try {
        const now = new Date().toISOString();
        const r = report as any;

        await context.env.DB.prepare(
          'INSERT OR REPLACE INTO beauty_reports (id, user_id, report_json, image_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(reportId, userId, JSON.stringify(report), extractImageKey(imageUrl) || null, now, now).run();

        const existing = await context.env.DB.prepare(
          'SELECT id, analysis_count FROM beauty_profiles WHERE user_id = ? LIMIT 1'
        ).bind(userId).first();

        if (existing) {
          await context.env.DB.prepare(
            'UPDATE beauty_profiles SET current_face_shape = ?, current_eye_shape = ?, analysis_count = COALESCE(analysis_count,0) + 1, last_analysis_id = ?, updated_at = ? WHERE user_id = ?'
          ).bind(
            r?.faceShape?.shape || null,
            r?.features?.eyes?.name || null,
            reportId,
            now,
            userId,
          ).run();
        } else {
          const profileId = 'bp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
          await context.env.DB.prepare(
            'INSERT INTO beauty_profiles (id, user_id, avatar_url, current_face_shape, current_eye_shape, skin_info, preferred_style, favorite_colors, analysis_count, last_analysis_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            profileId, userId, null,
            r?.faceShape?.shape || null,
            r?.features?.eyes?.name || null,
            null,
            r?.makeup?.base || null,
            null,
            1, reportId, now, now,
          ).run();
        }

        const histId = 'bah_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
        await context.env.DB.prepare(
          'INSERT INTO beauty_analysis_history (id, user_id, report_id, image_url, face_analysis_json, style_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(histId, userId, reportId, imageUrl, faceAnalysis ? JSON.stringify(faceAnalysis) : null, r?.makeup?.base || null, now).run();

        await updateUserProfile(context.env.DB, userId, { lastAnalysisImage: imageUrl }).catch(() => {});
      } catch (e: any) {
        console.warn('[Beauty] Failed to persist beauty data:', e.message);
      }
    }

    return new Response(JSON.stringify({ success: true, data: { reportId, report } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch (e: any) {
    // Check for structured errors from analyzeBeauty
    if (e.message && (e.message.startsWith('FACE_ANALYSIS_REQUIRED') || e.message.startsWith('FACE_NOT_DETECTED'))) {
      return new Response(JSON.stringify({ success: false, error: { code: 'FACE_ANALYSIS_ERROR', message: e.message.split(': ').slice(1).join(': ') } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message || 'Analysis failed' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
