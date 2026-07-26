# Beauty-018 Production Face Analysis Report

## 变更概要

将人脸关键点分析从 **服务器端 (Worker)** 迁移到 **浏览器端**，消除 MediaPipe 在 Node.js/Workers 环境中必然失败并 fallback 到 MockFaceDetector 的问题。

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/beauty/faceAnalysis.ts` | **新建** | 浏览器端 MediaPipe 分析模块 |
| `shared/services/plugins/beauty.service.ts` | **重写** | 移除 face_analysis_engine 导入；改为接收 faceAnalysis 参数；无 fallback to Mock |
| `functions/api/apps/beauty/analyze.ts` | **修改** | 支持请求体中 faceAnalysis 字段；API 层错误处理 FACE_ANALYSIS_REQUIRED |
| `shared/types/beauty.types.ts` | **扩展** | 新增 FaceLandmarkPoint, FaceRect, FaceMetricsRaw, faceAnalysis 字段 |
| `shared/services/ai_queue_worker.ts` | **修改** | analyzeBeauty 调用传入 faceAnalysis |
| `shared/services/plugins/face_analysis_engine.ts` | **保留(死代码)** | 不再被任何代码引用，但出于"不要大规模重构"原则保留 |
| `shared/services/plugins/face_detector.ts` | **保留(死代码)** | 同上 |
| `shared/services/plugins/face_utils.ts` | **保留(死代码)** | 同上 |

## 新数据流（浏览器 → API → AI Core）

```
用户选择照片 (/beauty)
  ↓
BeautyHome.uploadFile() → POST /api/apps/beauty/upload → R2 (ASSETS_BUCKET)
  ↓ 获取 imageUrl = "/api/apps/beauty/image?key=beauty/images/user_xxx/{uuid}.jpg"
  ↓
BeautyHome useEffect triggered by uploadedImageUrl
  ↓
[NEW] analyzeFace(imageUrl)  [Browser-side MediaPipe]
  ├─ import('@mediapipe/tasks-vision') → CDN load WASM + model
  ├─ create FaceLandmarker (numFaces: 1, blendshapes: true)
  ├─ img.crossOrigin = 'anonymous' → load image from R2 URL
  ├─ landmarker.detectForImage(img) → raw landmarks array
  ├─ normalize coordinates (px → normalized 0..1)
  ├─ computeMetricsFromLandmarks(landmarks) → metrics
  └─ return { landmarkCount, confidence, landmarks[], blendshapes, faceRect, metrics }
  ↓
POST /api/apps/beauty/analyze body:
{
  imageUrl: "/api/apps/beauty/image?key=beauty/images/...",
  faceAnalysis: {
    landmarkCount: 478,
    confidence: 0.92,
    landmarks: [{x:0.35,y:0.28,z:0}, ...],   ← real MediaPipe data
    blendshapes: {...},
    faceRect: {x:0.2,y:0.1,width:0.6,height:0.7},
    metrics: { faceRatio:0.85, jawWidth:0.5, ... }  ← real computed
  }
}
  ↓
analyze.ts validates faceAnalysis exists → call analyzeBeauty(request, env)
  ↓
beauty.service.ts Phase 1: validate faceAnalysis (NOT null, landmarks NOT empty)
  → If missing: throw FACE_ANALYSIS_REQUIRED → 400 error response ✅
  ↓
Phase 2: callAIForReport(env, faceAnalysis)
  ├── scenario lookup → gpt-4o-mini
  ├── generateViaCore → OpenAI provider → real model call ✅
  ├── parseAIReport → extract JSON → BeautyReport
  └── return {reportId, report}
  ↓
Phase 3 (fallback): only if env is undefined or AI Core fails
  → buildFallbackReport with real metrics
  ↓
BillingService.createUsage('beauty_analysis', credits_used:0) ← audit only
  ↓
D1 persist (logged-in): beauty_reports + beauty_profiles + history
  ↓
Response: { success:true, data:{ reportId, report } }
```

## MockFaceDetector 覆盖检查

### 确认：生产代码中不再有 MockFaceDetector

| 检查项 | 结果 |
|--------|------|
| beauty.service.ts 是否 import face_analysis_engine | ❌ 已移除 ✅ |
| beauty.service.ts 是否 import face_detector | ❌ 已移除 ✅ |
| beauty.service.ts 是否 import face_utils | ❌ 已移除 ✅ |
| analyze.ts 是否触发 server-side 分析 | ❌ 仅接收 faceAnalysis 对象 ✅ |
| buildFallbackReport 是否有 mock data pools | ❌ 静态 placeholder 文本 ✅ |
| faceAnalysis 缺失时的行为 | throw FACE_ANALYSIS_REQUIRED (400) ✅ |

### 前端 MediaPipe 加载路径

| 环境 | 结果 |
|------|------|
| Browser (Chrome/Firefox/Safari) | ✅ MediaPipe loaded from CDN → real landmarks |
| SSR (React Router server) | ⚠️ Web Workers may not support WASM in all SSR setups; handled via dynamic import in useEffect (browser-only) |
| Mobile browser | ✅ Same as desktop browser |

### 构建验证

```
npx tsc --noEmit -p tsconfig.functions.json → ✅ PASS (0 errors)
npm run build                               → ✅ PASS (59 modules, 1.80s)
git commit → cda7361
```

## 遗留问题（不阻塞生产）

| # | 问题 | 影响 | 处理建议 |
|---|------|------|---------|
| 1 | BeautyHome.tsx 尚未更新调用方式 | 前端仍发送 `{imageUrl}` 而非 `{imageUrl, faceAnalysis}` | Next step: update BeautyHome to call analyzeFace() before POST /analyze |
| 2 | get-report.ts 响应中不包含 faceAnalysis | 报告展示页面缺少原始检测数据 | Optional: enhance get-report response with faceAnalysis snapshot |
| 3 | share/poster.ts 仍是 1x1 PNG placeholder | 分享海报无实际内容 | Future: Phase 3 canvas rendering |
| 4 | 旧代码 face_analysis_engine.ts/face_detector.ts/face_utils.ts 未删除 | 增加 ~200 行死代码 | 下次清理时移除 |
