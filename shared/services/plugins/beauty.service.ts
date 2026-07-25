/** Beauty Plugin service — mock analysis logic */
import type {
  BeautyAnalysisRequest,
  BeautyReport,
  FaceShapeAnalysis,
  FeatureAnalysis,
  FeatureDetail,
  MakeupRecommendation,
  InfluencerMatch,
  ProductRecommendation,
} from '../../types/beauty.types';

// ── mock data pools ────────────────────────────────────────────────

const FACE_SHAPES = ['oval', 'round', 'square', 'heart', 'long'];
const MAKEUP_BASES = ['natural', 'glossy', 'matte', 'dewy'];
const LIP_COLORS = ['coral', 'rose', 'nude', 'burgundy', 'orange-red'];
const PLATFORMS = ['小红书', '抖音', '微博', 'Bilibili'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeFaceShapeAnalysis(): FaceShapeAnalysis {
  const shape = pickRandom(FACE_SHAPES);
  return {
    shape,
    confidence: +(0.75 + Math.random() * 0.22).toFixed(2),
    faceWidth: +(130 + Math.random() * 30).toFixed(0),
    faceLength: +(140 + Math.random() * 40).toFixed(0),
    cheekboneWidth: +(110 + Math.random() * 30).toFixed(0),
    jawWidth: +(85 + Math.random() * 30).toFixed(0),
    foreheadWidth: +(90 + Math.random() * 30).toFixed(0),
    proportions: {
      upper: +(0.28 + Math.random() * 0.08).toFixed(2),
      middle: +(0.33 + Math.random() * 0.08).toFixed(2),
      lower: +(0.28 + Math.random() * 0.08).toFixed(2),
    },
    canthalRatio: {
      innerCanthus: +(0.2 + Math.random() * 0.15).toFixed(2),
      eyeWidth: +(0.38 + Math.random() * 0.1).toFixed(2),
      outerCanthus: +(0.2 + Math.random() * 0.15).toFixed(2),
    },
    recommendations: [
      `适合的发型建议突出 ${shape === 'oval' ? '柔和轮廓' : shape === 'round' ? '纵向线条' : shape === 'square' ? '额头修饰' : shape === 'heart' ? '下颌丰满' : '缩短脸长'}`,
      '建议定期做面部瑜伽放松肌肉',
      '注意防晒防止光老化',
    ],
  };
}

function makeFeatureAnalysis(): FeatureAnalysis {
  const makeFeature = (name: string, defaults: Partial<FeatureDetail>): FeatureDetail => ({
    name,
    score: +(55 + Math.random() * 40).toFixed(0),
    description: `${name}区域分析：当前状态良好，建议关注${defaults.description || '细节优化'}。`,
    styleRecommendations: defaults.styleRecommendations || ['保持自然风格'],
  });

  return {
    eyes: makeFeature('眼', {
      description: '眼部轮廓对称性',
      styleRecommendations: ['圆眼适合下垂妆效', '杏眼适合自然眼影', '丹凤眼适合上扬眼线'],
    }),
    eyebrows: makeFeature('眉', {
      description: '眉毛毛流与形态',
      styleRecommendations: ['根据脸型选择眉型', '野生眉适合小脸', '平眉显年轻'],
    }),
    nose: makeFeature('鼻', {
      description: '鼻梁高度与鼻尖形态',
      styleRecommendations: ['侧影修容增加立体感', '高光提亮鼻尖'],
    }),
    lips: makeFeature('唇', {
      description: '嘴唇厚度与唇形轮廓',
      styleRecommendations: ['薄唇适合渐变咬唇', '厚唇适合哑光纯色'],
    }),
    chin: makeFeature('下巴', {
      description: '下巴翘度与宽度',
      styleRecommendations: ['尖下巴适合V脸修容'],
    }),
    overallHarmony: +(60 + Math.random() * 35).toFixed(0),
    suggestions: [
      '建议通过妆容调整比例协调性',
      '多尝试不同眉形找到最适合的一款',
      '护肤重点放在T区和双颊交界处',
    ],
  };
}

function makeMakeupRecommendation(): MakeupRecommendation {
  return {
    base: pickRandom(MAKEUP_BASES) + '底妆',
    eyeMakeup: pickRandom(['大地色渐变', '粉色系', '冷调烟熏', '橘棕色调']) + '眼影',
    lipColor: pickRandom(LIP_COLORS) + '口红',
    blushStyle: pickRandom(['苹果肌打圈', '斜向上扫刷', 'C区连接颧骨']),
    highlightAreas: ['鼻梁', '颧骨高点', '眉骨'],
    avoidAreas: ['鼻翼两侧', '下颌角'],
    reason: '根据脸型和五官特征匹配的风格建议',
  };
}

function makeInfluencers(): InfluencerMatch[] {
  return [
    {
      id: 'inf_001',
      name: pickRandom(['小美美妆课堂', '造型师Alice', '日常穿搭日记', '美妆达人Lily']),
      platform: pickRandom(PLATFORMS),
      followers: pickRandom(['10万+', '50万+', '200万+', '500万+']),
      styleMatchScore: +(0.8 + Math.random() * 0.18).toFixed(2),
      imageUrl: '',
      reasons: ['风格匹配度高', '内容专业度好', '粉丝互动积极'],
    },
    {
      id: 'inf_002',
      name: pickRandom(['妆容教程君', '时尚前线', '美学研究所', '护肤百科']),
      platform: pickRandom(PLATFORMS),
      followers: pickRandom(['5万+', '30万+', '100万+']),
      styleMatchScore: +(0.7 + Math.random() * 0.25).toFixed(2),
      imageUrl: '',
      reasons: ['内容更新频繁', '受众画像相似'],
    },
  ];
}

function makeProducts(): ProductRecommendation[] {
  const categories = ['粉底液', '散粉', '眼影盘', '口红', '腮红', '修容棒', '眉笔'];
  const brands = ['雅诗兰黛', '兰蔻', 'YSL', 'Mac', 'NARS', '完美日记', '花西子', '彩棠'];
  const results: ProductRecommendation[] = [];
  for (let i = 0; i < 5; i++) {
    results.push({
      id: `prod_${String(i + 1).padStart(3, '0')}`,
      name: `${pickRandom(brands)} ${pickRandom(categories)}`,
      category: pickRandom(categories),
      brand: pickRandom(brands),
      priceRange: pickRandom(['¥100-300', '¥300-600', '¥600-1000', '¥100-200']),
      rating: +(3.5 + Math.random() * 1.5).toFixed(1),
      matchReason: `适配 ${['肤质', '肤色', '风格'][(i % 3)]}的推荐产品`,
      imageUrl: '',
    });
  }
  return results;
}

// ── main analysis function ─────────────────────────────────────────

export async function analyzeBeauty(
  _request: BeautyAnalysisRequest,
): Promise<{ reportId: string; report: BeautyReport }> {
  // In production this would call an AI vision model
  // For mock mode we generate a structured report

  const analysisId = 'ana_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const reportId = 'rpt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  return {
    reportId,
    report: {
      userId: 'user_mock',
      analysisId,
      timestamp: new Date().toISOString(),
      faceShape: makeFaceShapeAnalysis(),
      features: makeFeatureAnalysis(),
      makeup: makeMakeupRecommendation(),
      influencers: makeInfluencers(),
      products: makeProducts(),
    },
  };
}
