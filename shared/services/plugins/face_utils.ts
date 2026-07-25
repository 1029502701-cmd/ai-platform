import type { FaceLandmarkResult, FacePoint } from './face_detector';

export interface FaceMetrics {
  faceWidth: number;
  faceHeight: number;
  faceRatio: number;
  jawWidth: number;
  chinLength: number;
  foreheadWidth: number;
  cheekboneWidth: number;
  eyeWidthLeft: number;
  eyeWidthRight: number;
  eyeDistance: number;
  eyeHeightLeft: number;
  eyeHeightRight: number;
  noseWidth: number;
  noseLength: number;
  lipWidth: number;
  lipHeight: number;
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Compute simple metrics from landmarks. Landmarks are expected normalized [0..1].
export function computeMetrics(result: FaceLandmarkResult | null): FaceMetrics {
  if (!result || !result.landmarks || result.landmarks.length === 0) {
    // Default minimal metrics
    return {
      faceWidth: 0,
      faceHeight: 0,
      faceRatio: 0,
      jawWidth: 0,
      chinLength: 0,
      foreheadWidth: 0,
      cheekboneWidth: 0,
      eyeWidthLeft: 0,
      eyeWidthRight: 0,
      eyeDistance: 0,
      eyeHeightLeft: 0,
      eyeHeightRight: 0,
      noseWidth: 0,
      noseLength: 0,
      lipWidth: 0,
      lipHeight: 0,
    };
  }

  const lm = result.landmarks as FacePoint[];
  const xs = lm.map((p) => p.x);
  const ys = lm.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  const faceRatio = faceHeight > 0 ? faceHeight / faceWidth : 0;

  // Approximate key points by percentiles within landmarks
  const leftMost = lm.reduce((a, b) => (a.x < b.x ? a : b));
  const rightMost = lm.reduce((a, b) => (a.x > b.x ? a : b));
  const bottomMost = lm.reduce((a, b) => (a.y > b.y ? a : b));

  // Chin length: distance from bottomMost to an estimated nose root (middle of landmarks)
  const center = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
  const chinLength = Math.max(0, bottomMost.y - center.y);

  const jawWidth = Math.max(0, rightMost.x - leftMost.x) * 0.95;

  // Forehead width approximate: width at 15% from top
  const foreheadY = minY + faceHeight * 0.15;
  const xsAtForehead = lm.filter((p) => Math.abs(p.y - foreheadY) < faceHeight * 0.06).map((p) => p.x);
  const foreheadWidth = xsAtForehead.length >= 2 ? Math.max(...xsAtForehead) - Math.min(...xsAtForehead) : faceWidth * 0.9;

  // Cheekbone width approximate: width at 40% from top
  const cheekY = minY + faceHeight * 0.4;
  const xsAtCheek = lm.filter((p) => Math.abs(p.y - cheekY) < faceHeight * 0.06).map((p) => p.x);
  const cheekboneWidth = xsAtCheek.length >= 2 ? Math.max(...xsAtCheek) - Math.min(...xsAtCheek) : faceWidth * 0.95;

  // Eyes: take points roughly at left-top and right-top quarters
  const leftEyeCandidates = lm.filter((p) => p.x < center.x && p.y < center.y);
  const rightEyeCandidates = lm.filter((p) => p.x > center.x && p.y < center.y);
  const leftEyeCenter = leftEyeCandidates.length ? leftEyeCandidates.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y })) : { x: center.x - faceWidth * 0.2, y: center.y - faceHeight * 0.15 };
  const rightEyeCenter = rightEyeCandidates.length ? rightEyeCandidates.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y })) : { x: center.x + faceWidth * 0.2, y: center.y - faceHeight * 0.15 };
  if (leftEyeCandidates.length) {
    leftEyeCenter.x /= leftEyeCandidates.length;
    leftEyeCenter.y /= leftEyeCandidates.length;
  }
  if (rightEyeCandidates.length) {
    rightEyeCenter.x /= rightEyeCandidates.length;
    rightEyeCenter.y /= rightEyeCandidates.length;
  }

  const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x);

  // Eye widths/height approximations using nearby points
  const leftEyeWidth = faceWidth * 0.15;
  const rightEyeWidth = faceWidth * 0.15;
  const leftEyeHeight = faceHeight * 0.05;
  const rightEyeHeight = faceHeight * 0.05;

  // Nose approximations
  const noseWidth = faceWidth * 0.18;
  const noseLength = faceHeight * 0.22;

  // Lips
  const lipWidth = faceWidth * 0.45;
  const lipHeight = faceHeight * 0.06;

  return {
    faceWidth,
    faceHeight,
    faceRatio,
    jawWidth,
    chinLength,
    foreheadWidth,
    cheekboneWidth,
    eyeWidthLeft: leftEyeWidth,
    eyeWidthRight: rightEyeWidth,
    eyeDistance,
    eyeHeightLeft: leftEyeHeight,
    eyeHeightRight: rightEyeHeight,
    noseWidth,
    noseLength,
    lipWidth,
    lipHeight,
  };
}

export function calculateFaceShape(metrics: FaceMetrics): 'oval' | 'round' | 'square' | 'long' | 'diamond' {
  const { faceRatio, jawWidth, chinLength, foreheadWidth, faceHeight } = metrics;

  if (faceRatio >= 1.33) return 'long';
  if (faceRatio <= 0.95) return 'round';

  // Square: strong jaw relative to forehead
  if (jawWidth > foreheadWidth * 1.05 && chinLength > faceHeight * 0.22) return 'square';

  // Diamond: narrow forehead and jaw but longer chin
  if (foreheadWidth < jawWidth * 0.9 && chinLength > faceHeight * 0.2) return 'diamond';

  return 'oval';
}

export function calculateEyeShape(metrics: FaceMetrics): 'almond' | 'round' | 'upturned' | 'monolid' {
  const { eyeWidthLeft, eyeWidthRight, eyeHeightLeft, eyeHeightRight, eyeDistance, faceWidth } = metrics;
  const avgEAR = (eyeHeightLeft / Math.max(0.0001, eyeWidthLeft) + eyeHeightRight / Math.max(0.0001, eyeWidthRight)) / 2;
  const relEyeDist = eyeDistance / Math.max(0.0001, faceWidth);

  if (avgEAR < 0.22) return 'monolid';
  if (avgEAR > 0.35) return 'round';
  if (relEyeDist > 0.38) return 'almond';
  return 'upturned';
}
