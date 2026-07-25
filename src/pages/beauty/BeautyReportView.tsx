import { useLocation, useNavigate } from "react-router";
import type { BeautyReport } from "../../../shared/types/beauty.types";

/** Beauty Report View — display analysis results */
export default function BeautyReportViewPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const report = location.state?.report as BeautyReport | undefined;
  const previewUrl = location.state?.previewUrl as string | undefined;

  if (!report) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">暂无分析数据</p>
          <button
            onClick={() => navigate("/beauty")}
            className="mt-4 rounded-lg bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
          >
            返回分析页
          </button>
        </div>
      </div>
    );
  }

  const { faceShape, features, makeup, influencers, products } = report;

  const ScoreBar = ({ value, label }: { value: number; label: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{value}/100</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-gray-50">
      {/* Header with photo + title */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/beauty")}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-sm hover:bg-white/30"
            >
              ← 返回
            </button>
            <h1 className="text-xl font-bold">AI 美妆分析报告</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        {/* Preview photo */}
        {previewUrl && (
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <img src={previewUrl} alt="分析照片" className="h-48 w-full object-cover" />
          </div>
        )}

        {/* 1. Face Shape Analysis */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm text-purple-600">1</span>
            脸型分析
          </h2>

          <div className="space-y-4">
            <div className="rounded-lg bg-purple-50 p-4">
              <div className="text-sm text-gray-500">脸型类型</div>
              <div className="mt-1 text-xl font-bold text-purple-700">
                {faceShape.shape === "oval" && "鹅蛋脸"}
                {faceShape.shape === "round" && "圆脸"}
                {faceShape.shape === "square" && "方脸"}
                {faceShape.shape === "heart" && "心形脸"}
                {faceShape.shape === "long" && "长脸"}
                {" "}
                · 置信度 {faceShape.confidence * 100}%
              </div>
            </div>

            {/* Facial measurements */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-100 p-3">
                <span className="text-gray-500">脸宽</span>{" "}
                <span className="ml-1 font-medium">{faceShape.faceWidth}mm</span>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <span className="text-gray-500">脸长</span>{" "}
                <span className="ml-1 font-medium">{faceShape.faceLength}mm</span>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <span className="text-gray-500">颧骨</span>{" "}
                <span className="ml-1 font-medium">{faceShape.cheekboneWidth}mm</span>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <span className="text-gray-500">下颌</span>{" "}
                <span className="ml-1 font-medium">{faceShape.jawWidth}mm</span>
              </div>
            </div>

            {/* Proportions */}
            <div>
              <div className="mb-2 text-sm font-medium text-gray-700">三庭比例</div>
              <ScoreBar value={(faceShape.proportions.upper / 0.37) * 100} label="上庭" />
              <div className="mt-2">
                <ScoreBar value={(faceShape.proportions.middle / 0.37) * 100} label="中庭" />
              </div>
              <div className="mt-2">
                <ScoreBar value={(faceShape.proportions.lower / 0.37) * 100} label="下庭" />
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-1.5 text-sm">
              <div className="font-medium text-gray-700">建议：</div>
              {faceShape.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                  {r}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Feature Analysis */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm text-blue-600">2</span>
            五官分析
          </h2>

          <ScoreBar value={features.overallHarmony} label="五官综合协调度" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: "眼睛", score: features.eyes.score },
              { label: "眉毛", score: features.eyebrows.score },
              { label: "鼻子", score: features.nose.score },
              { label: "嘴唇", score: features.lips.score },
              { label: "下巴", score: features.chin.score },
            ].map(({ label, score }) => (
              <ScoreBar key={label} value={score} label={label} />
            ))}
          </div>

          <div className="mt-4 space-y-2 text-sm text-gray-600">
            {features.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                {s}
              </div>
            ))}
          </div>
        </section>

        {/* 3. Makeup Recommendations */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-sm text-pink-600">3</span>
            妆容建议
          </h2>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-pink-50 p-3">
              <span className="font-medium text-pink-700">底妆风格：</span>
              <span className="ml-1 text-pink-600">{makeup.base}</span>
            </div>
            <div className="rounded-lg bg-pink-50 p-3">
              <span className="font-medium text-pink-700">眼妆：</span>
              <span className="ml-1 text-pink-600">{makeup.eyeMakeup}</span>
            </div>
            <div className="rounded-lg bg-pink-50 p-3">
              <span className="font-medium text-pink-700">唇色：</span>
              <span className="ml-1 text-pink-600">{makeup.lipColor}</span>
            </div>
            <div className="rounded-lg bg-pink-50 p-3">
              <span className="font-medium text-pink-700">腮红：</span>
              <span className="ml-1 text-pink-600">{makeup.blushStyle}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-green-50 p-3">
                <span className="text-sm font-medium text-green-700">高光区域：</span>
                <p className="mt-1 text-xs text-green-600">
                  {makeup.highlightAreas.join("、")}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <span className="text-sm font-medium text-red-700">避免区域：</span>
                <p className="mt-1 text-xs text-red-600">
                  {makeup.avoidAreas.join("、")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Influencer Recommendations */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm text-orange-600">4</span>
            达人推荐
          </h2>

          <div className="space-y-3">
            {influencers.map((inf) => (
              <div
                key={inf.id}
                className="flex items-start gap-3 rounded-lg border border-gray-100 p-4 transition hover:border-orange-200 hover:bg-orange-50/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-400 text-lg text-white">
                  {inf.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{inf.name}</span>
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600">
                      {inf.platform}
                    </span>
                    <span className="text-xs text-gray-400">{inf.followers}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    匹配度 {inf.styleMatchScore * 100}%
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    {inf.reasons.map((r, i) => (
                      <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Product Recommendations */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm text-teal-600">5</span>
            商品推荐
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-lg border border-gray-100 overflow-hidden transition hover:border-teal-200 hover:shadow-sm"
              >
                <div className="h-20 bg-gradient-to-r from-teal-50 to-cyan-50" />
                <div className="p-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-teal-600">{product.brand}</span>
                    <span className="text-xs text-gray-400">{product.priceRange}</span>
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-gray-900">{product.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span>{product.category}</span>
                    <span className="text-yellow-500">{'★'.repeat(Math.round(product.rating))}</span>
                    <span>{product.rating}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-gray-500">{product.matchReason}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Analysis timestamp */}
        <div className="text-center text-xs text-gray-400">
          分析时间：{new Date(report.timestamp).toLocaleString("zh-CN")}
        </div>
      </div>
    </div>
  );
}
