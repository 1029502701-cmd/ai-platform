import assert from 'assert';
import { z } from 'zod';
import {
  AnalyzeBeautyRequestSchema,
  ProfileUpdateSchema,
  type AnalyzeBeautyRequest,
  type ProfileUpdate,
} from '../../shared/validation/beauty.schema';

async function run() {
  // --- Test AnalyzeBeautyRequestSchema ---
  
  // Valid request
  const validRequest: AnalyzeBeautyRequest = {
    imageUrl: 'https://example.com/image.jpg',
    faceAnalysis: {
      landmarkCount: 5,
      confidence: 0.95,
      landmarks: [
        { x: 100, y: 100, z: 0.5 },
        { x: 150, y: 100, z: 0.5 },
        { x: 200, y: 100, z: 0.5 },
        { x: 125, y: 150, z: 0.5 },
        { x: 175, y: 150, z: 0.5 },
      ],
      faceRect: { x: 50, y: 50, width: 200, height: 200 },
      metrics: {
        faceRatio: 1.2,
        jawWidth: 120,
        chinLength: 40,
        foreheadWidth: 110,
        cheekboneWidth: 100,
        eyeDistance: 60,
        noseWidth: 30,
        noseLength: 40,
        lipWidth: 40,
        lipHeight: 20,
        confidence: 0.95,
      },
    },
  };

  const validResult = AnalyzeBeautyRequestSchema.safeParse(validRequest);
  assert(validResult.success, 'Valid request should pass validation');

  // Missing imageUrl
  const missingUrl = { ...validRequest, imageUrl: undefined as any };
  const urlResult = AnalyzeBeautyRequestSchema.safeParse(missingUrl);
  assert(!urlResult.success, 'Missing imageUrl should fail');

  // Invalid faceAnalysis (missing landmarks)
  const invalidFace = {
    ...validRequest,
    faceAnalysis: { ...validRequest.faceAnalysis, landmarks: [] },
  };
  const faceResult = AnalyzeBeautyRequestSchema.safeParse(invalidFace);
  assert(!faceResult.success, 'Empty landmarks should fail');

  console.log('AnalyzeBeautyRequestSchema tests passed');

  // --- Test ProfileUpdateSchema ---
  
  // Valid profile update
  const validUpdate: ProfileUpdate = {
    current_face_shape: 'oval',
    skin_info: 'Normal skin',
    preferred_style: 'classic',
  };
  const updateResult = ProfileUpdateSchema.safeParse(validUpdate);
  assert(updateResult.success, 'Valid profile update should pass');

  // Empty object should still pass (all fields optional)
  const emptyResult = ProfileUpdateSchema.safeParse({});
  assert(emptyResult.success, 'Empty object should pass (all fields optional)');

  console.log('ProfileUpdateSchema tests passed');

  console.log('All beauty validation tests passed!');
}

run().catch((e) => {
  console.error('Test failed:', e);
  process.exit(2);
});
