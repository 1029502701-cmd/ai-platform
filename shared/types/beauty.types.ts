/** Beauty Plugin types — shared between frontend and API */

export interface UserContext {
  mock?: boolean;
  userProfile?: any;
}

export interface BeautyAnalysisRequest {
  userContext: UserContext;
  // Optional: URL to an uploaded/accessible image to analyze
  imageUrl?: string;
}

// ── facial geometry ────────────────────────────────────────────────

export interface FaceShapeAnalysis {
  shape: string;
  confidence: number;
  faceWidth: number;
  faceLength: number;
  cheekboneWidth: number;
  jawWidth: number;
  foreheadWidth: number;
  proportions: Record<string, number>;
  canthalRatio: {
    innerCanthus: number;
    eyeWidth: number;
    outerCanthus: number;
  };
  recommendations: string[];
}

// ── features ───────────────────────────────────────────────────────

export interface FeatureAnalysis {
  eyes: FeatureDetail;
  eyebrows: FeatureDetail;
  nose: FeatureDetail;
  lips: FeatureDetail;
  chin: FeatureDetail;
  overallHarmony: number;
  suggestions: string[];
}

export interface FeatureDetail {
  name: string;
  score: number;
  description: string;
  styleRecommendations: string[];
}

// ── makeup ─────────────────────────────────────────────────────────

export interface MakeupRecommendation {
  base: string;
  eyeMakeup: string;
  lipColor: string;
  blushStyle: string;
  highlightAreas: string[];
  avoidAreas: string[];
  reason: string;
}

// ── influencer ─────────────────────────────────────────────────────

export interface InfluencerMatch {
  id: string;
  name: string;
  platform: string;
  followers: string;
  styleMatchScore: number;
  imageUrl: string;
  reasons: string[];
}

// ── product ────────────────────────────────────────────────────────

export interface ProductRecommendation {
  id: string;
  name: string;
  category: string;
  brand: string;
  priceRange: string;
  rating: number;
  matchReason: string;
  imageUrl: string;
}

// ── report ─────────────────────────────────────────────────────────

export interface BeautyReport {
  userId: string;
  analysisId: string;
  timestamp: string;
  faceShape: FaceShapeAnalysis;
  features: FeatureAnalysis;
  makeup: MakeupRecommendation;
  influencers: InfluencerMatch[];
  products: ProductRecommendation[];
  // optional raw face analysis payload (kept for history/audit purposes)
  faceAnalysis?: any;
}

export interface BeautyAnalyzeResponse {
  success: boolean;
  data?: {
    reportId: string;
    report: BeautyReport;
  };
  error?: { code: string; message: string };
}
