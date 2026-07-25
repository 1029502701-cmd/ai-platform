export interface FacePoint {
  x: number;
  y: number;
  z?: number;
}

export interface FaceLandmarkResult {
  landmarks: FacePoint[];
  faceBlendshapes?: Record<string, number>;
  confidence?: number;
  imageWidth?: number;
  imageHeight?: number;
}

export interface FaceDetector {
  analyze(imageUrl: string): Promise<FaceLandmarkResult | null>;
}

// Lightweight mock detector that returns a plausible set of normalized landmarks.
export class MockFaceDetector implements FaceDetector {
  async analyze(_imageUrl: string): Promise<FaceLandmarkResult> {
    // Return 478 pseudo-landmarks distributed in an oval region (normalized coords 0..1)
    const count = 478;
    const landmarks: FacePoint[] = [];
    for (let i = 0; i < count; i++) {
      // Spread points roughly around a vertically oriented oval in normalized coords
      const theta = (i / count) * Math.PI * 2;
      const rx = 0.18 + 0.02 * Math.cos(theta * 3);
      const ry = 0.26 + 0.03 * Math.sin(theta * 5);
      const cx = 0.5 + 0.02 * Math.cos(theta * 2);
      const cy = 0.5 + 0.02 * Math.sin(theta * 3);
      const x = Math.max(0, Math.min(1, cx + Math.cos(theta) * rx));
      const y = Math.max(0, Math.min(1, cy + Math.sin(theta) * ry));
      landmarks.push({ x, y, z: 0 });
    }

    return {
      landmarks,
      confidence: 0.78,
      imageWidth: 1,
      imageHeight: 1,
    };
  }
}

// MediaPipe-based detector. It only runs in environments where the MediaPipe Tasks API
// can be used (typically browser). In Node environments this will throw and the caller
// should fall back to the MockFaceDetector.
export class MediaPipeFaceDetector implements FaceDetector {
  private _landmarker: any | null = null;
  private _initialized = false;

  private async init() {
    if (this._initialized) return;
    try {
      // Dynamically import the package so Node environments that don't install it still
      // can typecheck/compile the code. Runtime import will fail if not available.
      // @ts-ignore - dynamically loaded
      const mp = await import('@mediapipe/tasks-vision');
      // FilesetResolver requires a path to wasm assets in many setups; relying on the
      // default CDN behavior for now. This may need adjustment in production.
      const FilesetResolver = mp.FilesetResolver;
      const FaceLandmarker = mp.FaceLandmarker;
      const visionFileset = await FilesetResolver.forVisionTasks();

      // Create a face landmarker configured per requirements
      this._landmarker = await FaceLandmarker.createFromOptions(visionFileset, {
        baseOptions: { modelAssetPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/face_landmarker.task' },
        runningMode: 'IMAGE',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });

      this._initialized = true;
    } catch (e) {
      // Re-throw with contextual message so callers can fallback.
      throw new Error('Failed to initialize MediaPipe FaceLandmarker: ' + (((e as any)?.message) || String(e)));
    }
  }

  async analyze(imageUrl: string) {
    if (typeof window === 'undefined' && typeof (globalThis as any)?.document === 'undefined') {
      throw new Error('MediaPipeFaceDetector requires a browser-like environment with DOM Image support.');
    }

    await this.init();
    if (!this._landmarker) throw new Error('FaceLandmarker not initialized');

    // Create an HTMLImageElement and wait for load
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const p = new Promise<FaceLandmarkResult>((resolve, reject) => {
      img.onload = async () => {
        try {
          // detectForImage expects an ImageData/HTMLImageElement
          const res = await this._landmarker.detectForImage(img);
          // res is an object or array depending on API — map first face
          const first = Array.isArray(res) ? res[0] : res;
          if (!first) {
            resolve({ landmarks: [], confidence: 0 });
            return;
          }

          const rawLandmarks = first?.landmarks || first?.faceLandmarks || [];
          const imgW = (img as any).naturalWidth || (img as any).width || 1;
          const imgH = (img as any).naturalHeight || (img as any).height || 1;

          const landmarks = (rawLandmarks || []).map((p: any) => {
            if (typeof p.x === 'number' && typeof p.y === 'number') {
              const nx = p.x > 1 ? p.x / imgW : p.x;
              const ny = p.y > 1 ? p.y / imgH : p.y;
              return { x: nx, y: ny, z: typeof p.z === 'number' ? p.z : 0 };
            }
            return { x: 0, y: 0, z: 0 };
          });

          const faceBlendshapes = first?.faceBlendshapes || undefined;
          const confidence = first?.score ?? 0;

          resolve({ landmarks, faceBlendshapes, confidence, imageWidth: imgW, imageHeight: imgH });
        } catch (e) {
          reject(e);
        }
      };

      img.onerror = (ev) => reject(new Error('Failed to load image for MediaPipe: ' + String(ev)));
      img.src = imageUrl;
    });

    return p;
  }
}
