/** Beauty Plugin service — real analysis pipeline via AI Core. */

import { analyzeImage as analyzeFaceImage } from './face_analysis_engine';
import { generateViaCore } from '../ai_core';
import type { CoreRequest } from '../ai_core';
import { calculateFaceShape } from './face_utils';
import type {
  BeautyAnalysisRequest,
  BeautyReport,
} from '../../types/beauty.types';


// ─── Constants ──────────────────────────────────────────────────────────────

const MOCK_CONVERSATION = '对话建议';
const MOCK_SKINCARE = '护肤建议';
const MOCK_FIX = '遮瑕建议';


// ─── Minimal fallback builder (only when AI Core unavailable) ───────────────

function buildFallbackReport(
  faceShapeName: string,
  userContext?: any,
): BeautyReport {
  const reportId = 'rpt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  return {
    userId: userContext?.userProfile?.id || 'user_mock',
    analysisId: reportId,
    timestamp: new Date().toISOString(),
    faceShape: {
      shape: faceShapeName,
      confidence: 0.5,
      faceWidth: 0, faceLength: 0, cheekboneWidth: 0, jawWidth: 0, foreheadWidth: 0,
      proportions: {},
      canthalRatio: { innerCanthus: 0, eyeWidth: 0, outerCanthus: 0 },
      recommendations: [`${MOCK_CONVERSATION}`, `${MOCK_SKINCARE}`, `${MOCK_FIX}`],
    },
    features: {
      eyes: { name: '眼', score: 0, description: '', styleRecommendations: [] },
      eyebrows: { name: '眉', score: 0, description: '', styleRecommendations: [] },
      nose: { name: '鼻', score: 0, description: '', styleRecommendations: [] },
      lips: { name: '唇', score: 0, description: '', styleRecommendations: [] },
      chin: { name: '下巴', score: 0, description: '', styleRecommendations: [] },
      overallHarmony: 0,
      suggestions: [],
    },
    makeup: {
      base: '', eyeMakeup: '', lipColor: '', blushStyle: '',
      highlightAreas: [], avoidAreas: [],
      reason: `AI Core不可用，此为${faceShapeName}脸型的降级建议`,
    },
    influencers: [],
    products: [],
    faceAnalysis: null,
  };
}


// ─── Main entry ─────────────────────────────────────────────────────────────

export async function analyzeBeauty(
  request: BeautyAnalysisRequest,
  env?: any,
): Promise<{ reportId: string; report: BeautyReport }> {
  const imageUrl = request.imageUrl;

  // Validate image
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) console.warn('[Beauty] Image unavailable:', res.status);
    } catch (e) {
      console.warn('[Beauty] Image error:', (e as any)?.message || e);
    }
  }

  // Phase 1: Face landmark detection
  let faceResult: any = null;
  try {
    if (imageUrl) {
      faceResult = await analyzeFaceImage(imageUrl, request.userContext);
    }
  } catch (e: any) {
    console.warn('[Beauty] Face analysis failed:', e.message);
  }

  // Extract metrics from face result
  const metrics = faceResult?.metrics || null;
  const faceShapeName = metrics ? calculateFaceShape(metrics) : 'oval';

  // Phase 2: Call AI Core to generate full beauty report from face data
  if (env && faceResult) {
    const aiReport = await callAIForReport(env, {
      requestId: 'beauty_' + Date.now(),
      userId: request.userContext?.userProfile?.id,
      imageUrl,
      faceShape: faceShapeName,
      eyeShape: faceResult.eyeShape,
      metrics,
      userContext: request.userContext,
    });
    if (aiReport.reportId && aiReport.report) {
      return aiReport;
    }
  }

  // Phase 3: Fallback when no image, no face data, or AI Core unavailable
  return {
    reportId: 'rpt_fallback_' + Date.now().toString(36),
    report: buildFallbackReport(faceShapeName, request.userContext),
  };
}


// ─── AI Core integration ────────────────────────────────────────────────────

interface AICoreInput {
  requestId: string;
  userId?: string;
  imageUrl: string | undefined;
  faceShape: string;
  eyeShape: string;
  metrics: any;
  userContext?: any;
}

async function callAIForReport(
  env: any,
  input: AICoreInput,
): Promise<{ reportId: string; report: BeautyReport }> {
  try {
    if (!env?.DB) { throw new Error('DB not configured'); }

    const scenarioRow = await env.DB.prepare(
      'SELECT default_model_id FROM ai_scenarios WHERE scenario_key = ?',
    ).get('beauty-analysis');
    const modelId = scenarioRow?.default_model_id || undefined;

    const coreReq: CoreRequest = {
      requestId: input.requestId,
      userId: input.userId,
      scenario: 'beauty-analysis',
      aiRequest: {
        model: modelId,
        messages: [
          {
            role: 'system',
            content: [
              'You are a professional beauty consultant. 请用中文回答所有报告内容。. Generate a personalized beauty analysis report based on facial geometry data.',
              'Return ONLY valid JSON matching this schema:',
              '{"reportId":"string","timestamp":"ISO8601","faceShape":{"shape":"oval|round|square|heart|long","confidence":0-1,"recommendations":["array"]},"features":{"eyes":{"name":"string","score":0-100,"description":"string","styleRecommendations":["array"]},"eyebrows":{...},"nose":{...},"lips":{...},"chin":{...},"overallHarmony":0-100,"suggestions":["array"]},"makeup":{"base":"string","eyeMakeup":"string","lipColor":"string","blushStyle":"string","highlightAreas":["array"],"avoidAreas":["array"],"reason":"string"},"influencers":[{"id":"string","name":"string","platform":"string","followers":"string","styleMatchScore":0-1,"reasons":["array"]}]},"products":[{"id":"string","name":"string","category":"string","brand":"string","priceRange":"string","rating":0-5,"matchReason":"string"}]}',
              'All fields must be personalized based on actual facial geometry — do NOT use generic templates.'
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `Face shape: ${input.faceShape}`,
              `Eye shape: ${input.eyeShape}`,
              `Metrics: faceWidth=${input.metrics?.faceWidth}, faceHeight=${input.metrics?.faceHeight}, faceRatio=${input.metrics?.faceRatio}, jawWidth=${input.metrics?.jawWidth}, chinLength=${input.metrics?.chinLength}`,
              `Forehead width: ${input.metrics?.foreheadWidth}`,
              `Cheekbone width: ${input.metrics?.cheekboneWidth}`,
              `Eye distance: ${input.metrics?.eyeDistance}`,
              `Nose width: ${input.metrics?.noseWidth}, nose length: ${input.metrics?.noseLength}`,
              `Lip width: ${input.metrics?.lipWidth}, lip height: ${input.metrics?.lipHeight}`,
              input.imageUrl ? `Image: ${input.imageUrl}` : '',
              input.userContext?.userProfile?.preferred_style ? `Preferred style: ${input.userContext.userProfile.preferred_style}` : ''
            ].filter(Boolean).join('\n')
          }
        ]
      }
    };

    const response = await generateViaCore(env, coreReq);
    if (!response.ok || !response.data?.content) {
      console.warn('[Beauty] AI Core report generation failed:', response.error);
      throw new Error(response.error || 'No AI response');
    }

    const parsed = parseAIReport(response.data.content, input);
    if (!parsed || !parsed.reportId) {
      console.warn('[Beauty] AI Core returned invalid report format');
      throw new Error('Invalid report format from AI');
    }

    console.info(`[Beauty] AI Core report generated: ${parsed.reportId}`);
    return parsed;
  } catch (e: any) {
    console.warn('[Beauty] callAIForReport failed:', e.message);
    return {
      reportId: 'rpt_fallback_' + Date.now().toString(36),
      report: buildFallbackReport(input.faceShape, input.userContext),
    };
  }
}


function parseAIReport(rawContent: string, input: AICoreInput): { reportId: string; report: BeautyReport } {
  // Try to extract JSON from markdown code blocks first
  let jsonStr = rawContent;
  const markdownMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (markdownMatch) {
    jsonStr = markdownMatch[1].trim();
  }

  // Find the first { and last } to handle trailing text
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in AI response');
  }
  jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);

  const data = JSON.parse(jsonStr);

  // Build a valid BeautyReport with safety defaults
  const reportId = data.reportId || ('rpt_ai_' + Date.now().toString(36));
  return {
    reportId,
    report: {
      userId: data.userId || input.userContext?.userProfile?.id || 'user_mock',
      analysisId: data.analysisId || reportId,
      timestamp: data.timestamp || new Date().toISOString(),
      faceShape: data.faceShape || null,
      features: data.features || null,
      makeup: data.makeup || null,
      influencers: Array.isArray(data.influencers) ? data.influencers : [],
      products: Array.isArray(data.products) ? data.products : [],
      faceAnalysis: input.metrics ? { ...input.metrics, faceShape: input.faceShape, eyeShape: input.eyeShape } : null,
    },
  };
}

