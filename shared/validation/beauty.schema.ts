import { z } from 'zod';

// Import shared types from beauty.types (re-exported for validation)
// These should match the shapes used in the API

// --- Beauty Analysis Request Validation ---
export const FaceAnalysisRequestSchema = z.object({
  userContext: z.object({
    mock: z.boolean().optional(),
    userProfile: z.object({
      id: z.string(),
      analysis_count: z.number().optional(),
      current_face_shape: z.string().optional(),
      current_eye_shape: z.string().optional(),
      last_analysis_id: z.string().optional(),
    }).optional(),
  }).optional(),
  imageUrl: z.string().url().min(1, 'Image URL is required'),
  faceAnalysis: z.object({
    landmarkCount: z.number().int().min(0),
    confidence: z.number().min(0).max(1),
    landmarks: z.array(
      z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      })
    ).min(5, 'At least 5 landmarks required'),
    blendshapes: z.record(z.number()).optional(),
    faceRect: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().min(0),
      height: z.number().min(0),
    }),
    metrics: z.object({
      faceRatio: z.number().min(0).max(3),
      jawWidth: z.number().min(0),
      chinLength: z.number().min(0),
      foreheadWidth: z.number().min(0),
      cheekboneWidth: z.number().min(0),
      eyeDistance: z.number().min(0),
      noseWidth: z.number().min(0),
      noseLength: z.number().min(0),
      lipWidth: z.number().min(0),
      lipHeight: z.number().min(0),
      confidence: z.number().min(0).max(1),
    }),
  }),
});

export type FaceAnalysisRequest = z.infer<typeof FaceAnalysisRequestSchema>;

// --- Analyze Beauty Request (combined input to analyze endpoint) ---
export const AnalyzeBeautyRequestSchema = z.object({
  imageUrl: z.string().url().min(1, 'Image URL is required'),
  faceAnalysis: z.object({
    landmarkCount: z.number().int(),
    confidence: z.number().min(0).max(1),
    landmarks: z.array(
      z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      })
    ).min(5),
    faceRect: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().min(0),
      height: z.number().min(0),
    }),
    metrics: z.object({
      faceRatio: z.number(),
      jawWidth: z.number(),
      chinLength: z.number(),
      foreheadWidth: z.number(),
      cheekboneWidth: z.number(),
      eyeDistance: z.number(),
      noseWidth: z.number(),
      noseLength: z.number(),
      lipWidth: z.number(),
      lipHeight: z.number(),
      confidence: z.number(),
    }),
  }),
});

export type AnalyzeBeautyRequest = z.infer<typeof AnalyzeBeautyRequestSchema>;

// --- Upload Request Validation ---
// Note: Upload uses multipart/form-data, so validation is at the field level
// We validate file type and size in the handler, schema for any JSON metadata
export const UploadRequestSchema = z.object({
  file: z.string().min(1, 'File is required'), // Placeholder for FormData file field
  // Additional metadata could be added here
});

// --- Profile Update Request Validation ---
export const ProfileUpdateSchema = z.object({
  current_face_shape: z.string().optional(),
  current_eye_shape: z.string().optional(),
  skin_info: z.string().optional(),
  preferred_style: z.string().optional(),
  favorite_colors: z.array(z.string()).optional(),
  avatar_url: z.string().url().optional(),
});

export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

// --- Error response type ---
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

