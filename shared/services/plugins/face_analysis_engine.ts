import type { FaceLandmarkResult } from './face_detector';
import { MockFaceDetector, MediaPipeFaceDetector } from './face_detector';
import { computeMetrics, calculateFaceShape, calculateEyeShape } from './face_utils';
import type { FaceMetrics } from './face_utils';
import type { UserContext } from '../../types/beauty.types';

export interface FaceAnalysisResult {
  faceShape: string;
  eyeShape: string;
  metrics: FaceMetrics;
  confidence: number;
}

export async function analyzeImage(imageUrl: string, userContext: UserContext | undefined): Promise<FaceAnalysisResult | null> {
  const useMock = !!(userContext && userContext.mock === true);

  let detector: MockFaceDetector | MediaPipeFaceDetector | null = null;
  if (useMock) {
    detector = new MockFaceDetector();
  } else {
    detector = new MediaPipeFaceDetector();
  }

  let lmResult: FaceLandmarkResult | null = null;
  try {
    // In environments where MediaPipe can't run (Node), MediaPipeFaceDetector will throw and we
    // fall back to the mock implementation.
    lmResult = await detector.analyze(imageUrl);
  } catch (e) {
    // If MediaPipe failed, attempt a Mock
    try {
      const fallback = new MockFaceDetector();
      lmResult = await fallback.analyze(imageUrl);
    } catch (err) {
      lmResult = null;
    }
  }

  if (!lmResult) return null;

  const metrics = computeMetrics(lmResult);
  const faceShape = calculateFaceShape(metrics);
  const eyeShape = calculateEyeShape(metrics);
  const confidence = typeof lmResult.confidence === 'number' ? lmResult.confidence : 0.6;

  return {
    faceShape,
    eyeShape,
    metrics,
    confidence,
  };
}
