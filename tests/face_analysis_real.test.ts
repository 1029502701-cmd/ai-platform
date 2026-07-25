import assert from 'assert';
import { analyzeImage } from '../shared/services/plugins/face_analysis_engine';

(async () => {
  try {
    const imagePath = 'tests/fixtures/sample.png';
    const res = await analyzeImage(imagePath, { mock: true });
    assert(res, 'No result returned');
    assert(res?.metrics, 'No metrics present');

    const expectedKeys = ['faceShape', 'eyeShape', 'metrics', 'confidence'];
    for (const k of expectedKeys) {
      assert(k in (res as any), `Missing key ${k}`);
    }

    console.log('face_analysis_real.test.ts passed');
  } catch (e) {
    console.error('face_analysis_real.test.ts failed', e);
    process.exit(1);
  }
})();