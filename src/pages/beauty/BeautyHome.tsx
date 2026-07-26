import { useState, useRef, type ChangeEvent, useEffect } from "react";
import { useNavigate } from "react-router";
import type { BeautyReport } from "../../../shared/types/beauty.types";

/** Beauty Home page — upload image and start analysis */
export default function BeautyHomePage() {
  const navigate = useNavigate();
  
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // When upload completes, automatically trigger analyze
    if (uploadedImageUrl) {
      (async () => {
        setAnalyzing(true);
        setError(null);
        try {
          const response = await fetch("/api/apps/beauty/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: uploadedImageUrl }),
          });

          const result = await response.json();

          if (!result.success || !result.data) {
            throw new Error(result.error?.message || "分析失败");
          }

          navigate("/beauty/report", { state: { report: result.data.report as BeautyReport, reportId: result.data.reportId, previewUrl: uploadedImageUrl } });
        } catch (err: any) {
          setError(err.message || "分析失败，请稍后重试");
        } finally {
          setAnalyzing(false);
          setUploadProgress(null);
        }
      })();
    }
  }, [uploadedImageUrl, navigate]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("图片大小不能超过 10MB");
      return;
    }

    setError(null);
    setPreviewUrl(URL.createObjectURL(file));

    // Automatically upload
    try {
      setUploadProgress(0);
      const uploadResult = await uploadFile(file, (p) => setUploadProgress(p));
      setUploadedImageUrl(uploadResult.imageUrl);
    } catch (err: any) {
      setError(err.message || '上传失败');
      setUploadProgress(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCaptureClick = () => {
    captureInputRef.current?.click();
  };

  const uploadFile = (file: File, onProgress?: (p: number) => void): Promise<{ imageUrl: string; fileKey: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/apps/beauty/upload');

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (!res || !res.success) return reject(new Error(res?.error?.message || 'Upload failed'));
          resolve({ imageUrl: res.imageUrl, fileKey: res.fileKey });
        } catch (e) {
          reject(e);
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      if (xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const p = Math.round((e.loaded / e.total) * 100);
            onProgress?.(p);
          }
        };
      }

      const form = new FormData();
      form.append('file', file, file.name);
      xhr.send(form);
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gradient-to-b from-purple-50 via-white to-blue-50 px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">✨ AI 美妆分析</h1>
          <p className="mt-3 text-gray-500">
            上传您的照片，获取专业脸型分析、五官评分、妆容建议和个性化推荐
          </p>
        </div>
        <div className="text-center mb-6">
          <button onClick={() => navigate('/beauty/profile')} className="rounded-md bg-white border px-3 py-2 text-sm text-purple-600">我的画像</button>
        </div>

        {/* Upload Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {!previewUrl ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={handleUploadClick}
                disabled={analyzing}
                className="group flex w-full flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-300 px-8 py-14 transition hover:border-purple-400 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="text-4xl">📁</div>
                <div className="text-center">
                  <p className="font-medium text-gray-700 group-hover:text-purple-600">
                    点击或拖拽上传照片
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    支持 JPG、PNG、WEBP，最大 10MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="上传照片"
                />
              </button>

              <button
                onClick={handleCaptureClick}
                disabled={analyzing}
                className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm"
              >
                📷 使用相机拍摄
              </button>

              <input
                ref={captureInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileChange}
                className="hidden"
                aria-label="拍照"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl border border-gray-200">
                <img
                  src={previewUrl}
                  alt="预览"
                  className="h-64 w-full object-cover"
                />
                <button
                  onClick={() => {
                    setPreviewUrl("");
                    setUploadedImageUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    if (captureInputRef.current) captureInputRef.current.value = "";
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white transition hover:bg-black/70"
                >
                  更换照片
                </button>
              </div>

              {/* User tips */}
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <p className="font-medium text-gray-700">💡 拍摄建议：</p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-xs text-gray-500">
                  <li>正面平视，光线均匀</li>
                  <li>不要戴帽子、墨镜等遮挡物</li>
                  <li>不要过度美颜或滤镜</li>
                  <li>头发不要遮住脸部轮廓</li>
                </ul>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}

          {/* Analyze Button (fallback) */}
          <button
            onClick={() => uploadedImageUrl && setUploadedImageUrl(uploadedImageUrl)}
            disabled={!previewUrl || analyzing}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-3.5 text-base font-medium text-white shadow transition disabled:cursor-not-allowed disabled:opacity-50 hover:from-purple-600 hover:to-indigo-600"
          >
            {analyzing ? (
              uploadProgress !== null ? (
                <>
                  <div className="h-5 w-5 flex items-center justify-center text-sm">{uploadProgress}%</div>
                  上传中 {uploadProgress}%
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  正在分析中...
                </>
              )
            ) : (
              <>
                🔍 开始分析
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}



