/** Browser-side face analysis using MediaPipe FaceLandmarker. */
import type { FaceAnalysisRequest, FaceAnalysisResult } from '../types/beauty.types';

let landmarker: any = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

async function ensureMediaPipe(): Promise<void> {
  if (landmarker) return;
  if (isInitializing) return initPromise!;

  isInitializing = true;
  try {
    // Dynamic import — only loads in browser, skips in SSR/node builds
    const mp = await import('@mediapipe/tasks-vision');
    const { FilesetResolver, FaceLandmarker } = mp;
    const visionFileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');

    landmarker = await FaceLandmarker.createFromOptions(visionFileset, {
      baseOptions: {
        modelAssetPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/face_landmarker.task',
      },
      runningMode: 'IMAGE',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
  } finally {
    isInitializing = false;
  }
}

function normalizeLandmarks(rawLandmarks: any[], imageWidth: number, imageHeight: number): FaceAnalysisRequest['faceAnalysis']['landmarks'] {
  if (!rawLandmarks || rawLandmarks.length === 0) return [];
  return (rawLandmarks as any[]).map((lm: any) => ({
    x: lm.x > 1 ? lm.x / imageWidth : lm.x,
    y: lm.y > 1 ? lm.y / imageHeight : lm.y,
    z: typeof lm.z === 'number' ? lm.z : 0,
  }));
}

function extractBlendshapes(blendshapes: any[] | undefined): Record<string, number> | undefined {
  if (!blendshapes || blendshapes.length === 0) return undefined;
  const result: Record<string, number> = {};
  for (const category of blendshapes) {
    for (const shape of category.landmarks || []) {
      result[category.categoryName] = shape.score;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// Compute metrics from normalized landmarks
export function computeMetricsFromLandmarks(landmarks: FaceAnalysisRequest['faceAnalysis']['landmarks']): {
  faceRatio: number;
  jawWidth: number;
  chinLength: number;
  foreheadWidth: number;
  cheekboneWidth: number;
  eyeDistance: number;
  noseWidth: number;
  noseLength: number;
  lipWidth: number;
  lipHeight: number;
  confidence: number;
} {
  if (!landmarks || landmarks.length < 3) {
    return { faceRatio: 0.8, jawWidth: 0.5, chinLength: 0.2, foreheadWidth: 0.5, cheekboneWidth: 0.45, eyeDistance: 0.2, noseWidth: 0.15, noseLength: 0.15, lipWidth: 0.35, lipHeight: 0.05, confidence: 0 };
  }

  const xs = landmarks.map(p => p.x);
  const ys = landmarks.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  const faceRatio = faceHeight > 0 ? faceHeight / faceWidth : 0.8;
  const center = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / xs.length };
  const bottomMost = landmarks.reduce((a, b) => (a.y > b.y ? a : b));
  const leftMost = landmarks.reduce((a, b) => (a.x < b.x ? a : b));
  const rightMost = landmarks.reduce((a, b) => (a.x > b.x ? a : b));

  const chinLength = bottomMost.y - center.y;
  const jawWidth = (rightMost.x - leftMost.x) * 0.95;
  const foreheadY = minY + faceHeight * 0.15;
  const xsAtForehead = landmarks.filter(p => Math.abs(p.y - foreheadY) < faceHeight * 0.06).map(p => p.x);
  const foreheadWidth = xsAtForehead.length >= 2 ? Math.max(...xsAtForehead) - Math.min(...xsAtForehead) : faceWidth * 0.9;
  const cheekY = minY + faceHeight * 0.4;
  const xsAtCheek = landmarks.filter(p => Math.abs(p.y - cheekY) < faceHeight * 0.06).map(p => p.x);
  const cheekboneWidth = xsAtCheek.length >= 2 ? Math.max(...xsAtCheek) - Math.min(...xsAtCheek) : faceWidth * 0.95;

  // Eyes: left-half above-center, right-half above-center
  const leftEyePts = landmarks.filter(p => p.x < center.x && p.y < center.y);
  const rightEyePts = landmarks.filter(p => p.x > center.x && p.y < center.y);
  const leftEyeCenter = leftEyePts.length ? { x: leftEyePts.reduce((s, p) => s + p.x, 0) / leftEyePts.length, y: leftEyePts.reduce((s, p) => s + p.y, 0) / leftEyePts.length } : { x: center.x - faceWidth * 0.2, y: center.y - faceHeight * 0.15 };
  const rightEyeCenter = rightEyePts.length ? { x: rightEyePts.reduce((s, p) => s + p.x, 0) / rightEyePts.length, y: rightEyePts.reduce((s, p) => s + p.y, 0) / rightEyePts.length } : { x: center.x + faceWidth * 0.2, y: center.y - faceHeight * 0.15 };
  const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x);

  const noseWidth = faceWidth * 0.18;
  const noseLength = faceHeight * 0.22;
  const lipWidth = faceWidth * 0.45;
  const lipHeight = faceHeight * 0.06;

  return { faceRatio, jawWidth, chinLength, foreheadWidth, cheekboneWidth, eyeDistance, noseWidth, noseLength, lipWidth, lipHeight, confidence: 0.78 };
}

export async function analyzeFace(imageSrc: string): Promise<FaceAnalysisResult> {
  await ensureMediaPipe();
  if (!landmarker) throw new Error('MediaPipe initialization failed');

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const res = landmarker.detectForImage(img);
        // res may be object or array depending on API version
        const results = Array.isArray(res) ? res : [res];
        const first = results.find(r => r.faceLandmarks && r.faceLandmarks.length > 0);

        if (!first || !first.faceLandmarks || first.faceLandmarks.length === 0) {
          reject(new Error('No face detected'));
          return;
        }

        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        const landmarks = normalizeLandmarks(first.faceLandmarks, imgW, imgH);
        const blendshapes = extractBlendshapes(first.faceBlendshapes);
        const faceRect = {
          x: Math.min(...landmarks.map(p => p.x)),
          y: Math.min(...landmarks.map(p => p.y)),
          width: Math.max(...landmarks.map(p => p.x)) - Math.min(...landmarks.map(p => p.x)),
          height: Math.max(...landmarks.map(p => p.y)) - Math.min(...landmarks.map(p => p.y)),
        };

        const metrics = computeMetricsFromLandmarks(landmarks);

        resolve({
          landmarkCount: landmarks.length,
          confidence: first.score ?? 0.9,
          landmarks,
          blendshapes,
          faceRect,
          metrics,
        });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}
