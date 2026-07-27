/**
 * Beauty AI Agent — delegates face analysis through platform AI Core pipeline.
 * All AI calls flow: Beauty Request → AI Core → Model Provider.
 */

import { generateViaCore } from '../ai_core';
import type { AIRequest } from '../ai_service';
import { BillingService } from '../billing.service';

/** Analyze an image through AI Core. */
export async function analyzeFaceWithAI(
  imageUrl: string,
  userId: string,
  env: any,
): Promise<{ success: boolean; result?: any }> {
  const startTime = Date.now();
  try {
    const coreReq: any = {
      requestId: 'beauty_' + userId + '_' + Date.now(),
      userId,
      scenario: 'beauty_face_analysis',
      aiRequest: { imageUrl, model: 'face_landmark_detection' },
    };
    const res = await generateViaCore(env, coreReq);
    if (!res.ok) {
      console.warn('[Beauty AI] AI Core analysis failed:', res.error);
      return { success: false, result: null };
    }
    try {
      const billingSvc = new BillingService(env.DB);
      await billingSvc.createUsage(userId, {
        user_id: userId, service: 'beauty_face_analysis',
        model: 'face_landmark_detection',
        input_tokens: 0, output_tokens: 0, credits_used: 0, cost_usd: 0, status: 'completed',
      });
    } catch (e) { console.warn('[Beauty AI] Billing record failed:', e); }
    return { success: true, result: res.data };
  } catch (e) {
    console.error('[Beauty AI] Exception:', (e as any)?.message || e);
    return { success: false, result: null };
  } finally {
    console.debug('[Beauty AI] Took ' + (Date.now() - startTime) + 'ms');
  }
}

/** Apply user profile bias deterministically. */
export function applyUserProfileBias(report: any, userProfile?: any): string {
  if (!userProfile) return report?.makeup?.base || '';
  try {
    if (userProfile.preferred_style) {
      report.makeup = report.makeup || {};
      report.makeup.base = userProfile.preferred_style;
      return 'preferred:' + userProfile.preferred_style;
    }
    if (userProfile.favorite_colors && typeof userProfile.favorite_colors === 'string') {
      const colors = userProfile.favorite_colors.split(',').map((s: string) => s.trim().toLowerCase());
      if (colors.includes('coral') || colors.includes('pink')) {
        report.makeup = report.makeup || {};
        report.makeup.lipColor = 'coral';
        return 'color_bias:coral';
      }
    }
    if (userProfile.last_style) {
      report.makeup = report.makeup || {};
      report.makeup.base = userProfile.last_style;
      return 'last_style:' + userProfile.last_style;
    }
  } catch (e) {}
  return report?.makeup?.base || '';
}
