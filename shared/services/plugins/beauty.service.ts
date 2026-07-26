/** Beauty Plugin service — generates reports from browser-provided face analysis data. */

import { generateViaCore } from '../ai_core';
import type { CoreRequest } from '../ai_core';
import type {
  BeautyAnalysisRequest,
  BeautyReport,
  FaceMetricsRaw,
} from '../../types/beauty.types';
import { matchProducts as mpFn, matchBloggers as mbFn } from './beauty_product.service';


// ─── Constants (fallback only) ──────────────────────────────────────────────

const MOCK_CONVERSATION = '对话建议';
const MOCK_SKINCARE = '护肤建议';
const MOCK_FIX = '遮瑕建议';


// ─── Minimal fallback builder (AI Core unavailable or no data) ───────────────

function buildFallbackReport(faceAnalysis?: any): BeautyReport {
  const reportId = 'rpt_' + Date.now().toString(36);
  const faceShapeName = faceAnalysis?.metrics ? inferFaceShape(faceAnalysis.metrics) : 'oval';
  return {
    userId: faceAnalysis?._userId || 'user_mock',
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

function inferFaceShape(m: FaceMetricsRaw): string {
  if (!m) return 'oval';
  if (m.faceRatio >= 1.33) return 'long';
  if (m.faceRatio <= 0.95) return 'round';
  if (m.jawWidth > m.foreheadWidth * 1.05 && m.chinLength > 0.2) return 'square';
  if (m.foreheadWidth < m.jawWidth * 0.9 && m.chinLength > 0.2) return 'diamond';
  return 'oval';
}


// ─── Main entry ─────────────────────────────────────────────────────────────

export async function analyzeBeauty(
  request: BeautyAnalysisRequest,
  env?: any,
): Promise<{ reportId: string; report: BeautyReport }> {
  // Validate that browser sent face analysis data
  if (!request.faceAnalysis) {
    throw new Error('FACE_ANALYSIS_REQUIRED: Please upload a valid face photo for analysis.');
  }

  // Validate the face data has landmarks
  if (!request.faceAnalysis.landmarks || request.faceAnalysis.landmarks.length === 0) {
    throw new Error('FACE_NOT_DETECTED: No face detected in the uploaded image. Please ensure your face is visible and not obstructed.');
  }

  // Tag userId onto faceAnalysis for downstream use
  const fa = { ...request.faceAnalysis, _userId: request.userContext?.userProfile?.id };

  // Call AI Core with browser face data to generate full beauty report
  if (env) {
    const aiReport = await callAIForReport(env, fa);
    if (aiReport.reportId && aiReport.report) {
      return aiReport;
    }
  }

  // Fallback when no env/AI
  return {
    reportId: 'rpt_fallback_' + Date.now().toString(36),
    report: buildFallbackReport(fa),
  };
}


// ─── AI Core integration ────────────────────────────────────────────────────

async function callAIForReport(
  env: any,
  faceAnalysis: any,
): Promise<{ reportId: string; report: BeautyReport }> {
  try {
    if (!env?.DB) { throw new Error('DB not configured'); }

    const scenarioRow = await env.DB.prepare(
      'SELECT default_model_id FROM ai_scenarios WHERE scenario_key = ?',
    ).get('beauty-analysis');
    const modelId = scenarioRow?.default_model_id || undefined;

    const coreReq: CoreRequest = {
      requestId: 'beauty_' + Date.now(),
      userId: faceAnalysis?._userId,
      scenario: 'beauty-analysis',
      aiRequest: {
        model: modelId,
        messages: [
          {
            role: 'system',
            content: [
              'You are a professional beauty consultant. 请用中文回答所有报告内容.',
              'Return ONLY valid JSON matching this schema:',
              '{"reportId":"string","timestamp":"ISO8601","faceShape":{"shape":"oval|round|square|heart|long","confidence":0-1,"recommendations":["array"]},"features":{"eyes":{"name":"string","score":0-100,"description":"string","styleRecommendations":["array"]},"eyebrows":{...},"nose":{...},"lips":{...},"chin":{...},"overallHarmony":0-100,"suggestions":["array"]},"makeup":{"base":"string","eyeMakeup":"string","lipColor":"string","blushStyle":"string","highlightAreas":["array"],"avoidAreas":["array"],"reason":"string"},"influencers":[{"id":"string","name":"string","platform":"string","followers":"string","styleMatchScore":0-1,"reasons":["array"]}]},"products":[{"id":"string","name":"string","category":"string","brand":"string","priceRange":"string","rating":0-5,"matchReason":"string"}]}',
              'All fields must be personalized based on actual facial geometry — do NOT use generic templates.'
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `Face shape ratio: ${faceAnalysis.metrics?.faceRatio}`,
              `Inferred shape: ${inferFaceShape(faceAnalysis.metrics)}`,
              `Eye shape distance ratio: ${faceAnalysis.metrics?.eyeDistance}`,
              `Jaw width: ${faceAnalysis.metrics?.jawWidth}, chin length: ${faceAnalysis.metrics?.chinLength}`,
              `Forehead width: ${faceAnalysis.metrics?.foreheadWidth}`,
              `Cheekbone width: ${faceAnalysis.metrics?.cheekboneWidth}`,
              `Eye distance: ${faceAnalysis.metrics?.eyeDistance}`,
              `Nose width: ${faceAnalysis.metrics?.noseWidth}, nose length: ${faceAnalysis.metrics?.noseLength}`,
              `Lip width: ${faceAnalysis.metrics?.lipWidth}, lip height: ${faceAnalysis.metrics?.lipHeight}`,
              `Face confidence: ${faceAnalysis.confidence}`,
              `Landmark count: ${faceAnalysis.landmarkCount}`,
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

    const parsed = parseAIReport(response.data.content);
    if (!parsed || !parsed.reportId) {

    // Augment with DB-backed products/bloggers
    try {
      const fsShape = parsed.report?.faceShape?.shape || undefined;
      const makeupBase = parsed.report?.makeup?.base || undefined;
      const promiseArr = [
        mpFn(env, { faceShape: fsShape, makeupStyle: makeupBase, limit: 8 }),
        mbFn(env, { faceShape: fsShape, makeupStyle: makeupBase, limit: 6 }),
      ];
      const resArr = await Promise.all(promiseArr);
      const products = resArr[0];
      const influencers = resArr[1];
      parsed.report.products = products.map(function(p) { return { id: p.id, brand: p.brand, name: p.name, category: p.category, image_url: p.image_url, affiliate_url: p.affiliate_url, price_range: p.price_range, rating: p.rating, matchReason: p.matchReason }; });
      parsed.report.influencers = influencers.map(function(b) { return { id: b.id, name: b.name, platform: b.platform, followers: String(Math.round(b.followers)), avatar_url: b.avatar_url, profile_url: b.profile_url, styleMatchScore: b.styleMatchScore, reasons: b.reasons }; });
    } catch (e) { console.warn("[Beauty] DB matching failed:", e); }

      console.warn('[Beauty] AI Core returned invalid report format');
      throw new Error('Invalid report format from AI');
    }

    console.info(`[Beauty] AI Core report generated: ${parsed.reportId}`);
    return parsed;
  } catch (e: any) {
    console.warn('[Beauty] callAIForReport failed:', e.message);
    return {
      reportId: 'rpt_fallback_' + Date.now().toString(36),
      report: buildFallbackReport(faceAnalysis),
    };
  }
}


function parseAIReport(rawContent: string): { reportId: string; report: BeautyReport } {
  let jsonStr = rawContent;
  const markdownMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (markdownMatch) {
    jsonStr = markdownMatch[1].trim();
  }

  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in AI response');
  }
  jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);

  const data = JSON.parse(jsonStr);

  const reportId = data.reportId || ('rpt_ai_' + Date.now().toString(36));
  return {
    reportId,
    report: {
      userId: data.userId || 'user_mock',
      analysisId: data.analysisId || reportId,
      timestamp: data.timestamp || new Date().toISOString(),
      faceShape: data.faceShape || null,
      features: data.features || null,
      makeup: data.makeup || null,
      influencers: Array.isArray(data.influencers) ? data.influencers : [],
      products: Array.isArray(data.products) ? data.products : [],
      faceAnalysis: null, // Face analysis stored separately in history table
    },
  };
}

