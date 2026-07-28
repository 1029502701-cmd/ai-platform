import { analyzeBeauty } from '../../../../shared/services/plugins/beauty.service.ts';
import { readSessionId } from '../../../../shared/auth/cookies.ts';
import { getSession } from '../../../../shared/auth/session.ts';
import { checkAndConsumeLimit } from '../../../../shared/auth/usage.ts';
import { BillingService } from '../../../../shared/services/billing.service.ts';
import { updateUserProfile } from '../../../../shared/user/profile.ts';
import { AnalyzeBeautyRequestSchema, type AnalyzeBeautyRequest } from '../../../../shared/validation/beauty.schema.ts';
import { getBeautyEventService } from '../../../../shared/services/beauty/BeautyEventService';

function extractImageKey(url: string): string | null {
  try {
    const parsed = new URL(url, 'http://localhost');
    const key = parsed.searchParams.get('key');
    if (key) return decodeURIComponent(key);
  } catch {
    return null;
  }
}

function validateRequestBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    return { success: false, error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' } };
  }
  const result = AnalyzeBeautyRequestSchema.safeParse(body);
  if (!result.success) {
    const messages = result.errors.map(e => {
      const path = e.path.join('.');
      return (path || 'body') + ': ' + e.message;
    }).join('; ');
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input: ' + messages } };
  }
  return { success: true, data: result.data };
}

export const onRequestPost = async (context: any) => {
  let userId: string | null = null;

  // Determine user ID early for event tracking
  try {
    const sessionId = readSessionId(context.request.headers.get('Cookie'));
    if (sessionId) {
      const session = await getSession(context.env, sessionId);
      if (session && session.user?.id) userId = session.user.id;
    }
  } catch (e) {}

  const eventService = getBeautyEventService(context.env?.DB);
  if (eventService && context.env?.DB) {
    eventService.trackEvent(userId, 'ANALYSIS_START', undefined, { source: 'api' }).catch(() => {});
  }

  try {
    const text = await context.request.text();
    const body = text ? JSON.parse(text) : {};

    const validation = validateRequestBody(body);
    if (!validation.success) {
      if (eventService && context.env?.DB) {
        eventService.trackEvent(userId, 'ANALYSIS_FAILED', undefined, { error: 'VALIDATION' }).catch(() => {});
      }
      return new Response(JSON.stringify({ success: false, error: validation.error }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const { imageUrl, faceAnalysis } = validation.data;

    let session: any = null;
    let localUserId: string | null = null;
    let userProfile: any = null;
    let isGuest = true;

    try {
      const sessionId = readSessionId(context.request.headers.get('Cookie'));
      if (sessionId) {
        session = await getSession(context.env, sessionId);
        if (session && session.user?.id && context.env?.DB) {
          localUserId = session.user.id;
          isGuest = false;
          try {
            userProfile = await context.env.DB.prepare('SELECT * FROM beauty_profiles WHERE user_id = ? LIMIT 1').bind(localUserId).first();
          } catch (e) {}
          const limitCheck = await checkAndConsumeLimit(context.env.DB, localUserId!);
          if (!limitCheck.ok) {
            if (eventService && context.env?.DB) {
              eventService.trackEvent(localUserId, 'ANALYSIS_FAILED', undefined, { error: 'RATE_LIMIT' }).catch(() => {});
            }
            return new Response(JSON.stringify({ success: false, error: { code: 'DAILY_LIMIT_EXCEEDED', message: 'Free analysis limit reached' } }), { status: 429, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
          }
        }
      }
    } catch (e: any) {
      console.warn('[Beauty] Auth failed:', e.message);
    }

    if (!localUserId) {
      localUserId = 'guest_' + Date.now().toString(36);
    }

    const userContext = isGuest ? {} : (userProfile ? { userProfile } : {});
    
    const startTimestamp = Date.now();
    const { reportId, report } = await analyzeBeauty({ userContext, imageUrl, faceAnalysis }, context.env);
    const durationMs = Date.now() - startTimestamp;

    // Track success with AI usage info potentially available in report
    if (eventService && context.env?.DB) {
      eventService.trackEvent(localUserId, 'ANALYSIS_SUCCESS', reportId, { duration: durationMs }).catch(() => {});
      
      // Also record AI usage (will be extended later for actual token counting)
      const aiSvc = (context.env as any)?.BEAUTY_AI_USAGE_SERVICE;
      if (aiSvc) {
        aiSvc.recordUsage(localUserId, reportId, 'openai-gpt-4o-mini', 0, 0, durationMs).catch(() => {});
      }
    }

    // Record usage / billing
    if (context.env?.DB) {
      const billingSvc = new BillingService(context.env.DB);
      try {
        await billingSvc.createUsage(localUserId!, {
          user_id: localUserId!, service: 'beauty_analysis', model: 'face_analysis', input_tokens: 0, output_tokens: 0, credits_used: 0, cost_usd: 0, status: 'completed',
        });
      } catch (e) { console.warn('[Beauty] Billing record failed:', e); }
    }

    // Save to D1 (logged-in users only)
    if (context.env?.DB && !isGuest && localUserId) {
      try {
        const now = new Date().toISOString();
        const r = report as any;
        await context.env.DB.prepare('INSERT OR REPLACE INTO beauty_reports (id, user_id, report_json, image_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(reportId, localUserId, JSON.stringify(report), extractImageKey(imageUrl) || null, now, now).run();

        const existing = await context.env.DB.prepare('SELECT id, analysis_count FROM beauty_profiles WHERE user_id = ? LIMIT 1').bind(localUserId).first();
        if (existing) {
          await context.env.DB.prepare('UPDATE beauty_profiles SET current_face_shape = ?, current_eye_shape = ?, analysis_count = COALESCE(analysis_count,0) + 1, last_analysis_id = ?, updated_at = ? WHERE user_id = ?').bind(r?.faceShape?.shape || null, r?.features?.eyes?.name || null, reportId, now, localUserId).run();
        } else {
          const profileId = 'bp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
          await context.env.DB.prepare('INSERT INTO beauty_profiles (id, user_id, avatar_url, current_face_shape, current_eye_shape, skin_info, preferred_style, favorite_colors, analysis_count, last_analysis_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(profileId, localUserId, null, r?.faceShape?.shape || null, r?.features?.eyes?.name || null, null, r?.makeup?.base || null, null, 1, reportId, now, now).run();
        }

        const histId = 'bah_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
        await context.env.DB.prepare('INSERT INTO beauty_analysis_history (id, user_id, report_id, image_url, face_analysis_json, style_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(histId, localUserId, reportId, imageUrl, faceAnalysis ? JSON.stringify(faceAnalysis) : null, r?.makeup?.base || null, now).run();
        await updateUserProfile(context.env.DB, localUserId, { lastAnalysisImage: imageUrl }).catch(() => {});
      } catch (e: any) {
        console.warn('[Beauty] Failed to persist beauty data:', e.message);
        // Still track the analysis as succeeded at AI level even if persistence failed
      }
    }

    return new Response(JSON.stringify({ success: true, data: { reportId, report } }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch (e: any) {
    if (eventService && context.env?.DB) {
      eventService.trackEvent(userId || localUserId, 'ANALYSIS_FAILED', undefined, { error: (e as any)?.message || 'INTERNAL' }).catch(() => {});
    }
    if (e?.message && (e.message.startsWith('FACE_ANALYSIS_REQUIRED') || e.message.startsWith('FACE_NOT_DETECTED'))) {
      return new Response(JSON.stringify({ success: false, error: { code: 'FACE_ANALYSIS_ERROR', message: e.message.split(': ').slice(1).join(': ') } }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Analysis failed' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};

