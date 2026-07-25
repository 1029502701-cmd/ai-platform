import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import type { BeautyReport } from "../../../shared/types/beauty.types";
import themes from "./beauty_report_theme";

type Props = {
  report?: BeautyReport;
  previewUrl?: string;
  readOnly?: boolean;
  themeName?: keyof typeof themes;
};

function useCountAnimation(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(p * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export default function BeautyReportView(props: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const report = props.report || (location.state as any)?.report as BeautyReport | undefined;
  const previewUrl = props.previewUrl || (location.state as any)?.previewUrl as string | undefined;
  const readOnly = props.readOnly || false;

  const score = useMemo(() => report?.features?.overallHarmony || 0, [report]);
  const animatedScore = useCountAnimation(score, 900);

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

  const onProductClick = (productId: string) => {
    // Fire-and-forget tracking event (best-effort)
    try {
      fetch('/api/apps/beauty/track', { method: 'POST', body: JSON.stringify({ type: 'product_click', id: productId }) }).catch(()=>{});
    } catch (e) {
      // ignore in client environments without fetch
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/beauty")}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-sm hover:bg-white/30"
            >
              ← 返回
            </button>
            <div>
              <h1 className="text-2xl font-bold">你的AI美妆画像</h1>
              <div className="text-sm opacity-90">{faceShape.shape ? `脸型：${faceShape.shape}` : ''} · 风格建议：{makeup.base}</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-xl border-2 border-white shadow-sm">
              <img src={previewUrl || '/api/apps/beauty/image?key=testfile.png'} alt="face" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        {/* Score card */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transform transition-transform duration-500" style={{transitionProperty: 'transform, opacity'}}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">颜值分析指数</div>
              <div className="mt-1 text-3xl font-bold text-gray-900">{animatedScore}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">五官协调度</div>
              <div className="mt-1 text-lg font-medium text-gray-700">{features.overallHarmony}/100</div>
            </div>
          </div>
        </section>

        {/* Face analysis card */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-fadeIn">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">脸型分析</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-purple-50 p-4">
              <div className="text-sm text-gray-500">脸型类型</div>
              <div className="mt-1 text-xl font-bold text-purple-700">
                {faceShape.shape}
                <span className="ml-2 text-sm text-gray-500">置信度 {(faceShape.confidence*100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-gray-100 p-3">脸宽 <span className="ml-1 font-medium">{faceShape.faceWidth}mm</span></div>
                <div className="rounded-lg border border-gray-100 p-3">脸长 <span className="ml-1 font-medium">{faceShape.faceLength}mm</span></div>
                <div className="rounded-lg border border-gray-100 p-3">颧骨 <span className="ml-1 font-medium">{faceShape.cheekboneWidth}mm</span></div>
                <div className="rounded-lg border border-gray-100 p-3">下颌 <span className="ml-1 font-medium">{faceShape.jawWidth}mm</span></div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">建议：</div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  {faceShape.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Makeup Plan */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">推荐妆容计划</h2>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg bg-pink-50 p-3">
              <div className="font-medium text-pink-700">底妆风格：</div>
              <div className="mt-1 text-pink-600">{makeup.base}</div>
              <div className="mt-2 text-xs text-gray-500">原因：{makeup.reason}</div>
            </div>
            <div className="rounded-lg bg-pink-50 p-3">
              <div className="font-medium text-pink-700">眼妆：</div>
              <div className="mt-1 text-pink-600">{makeup.eyeMakeup}</div>
              <div className="mt-2 text-xs text-gray-500">步骤：使用浅色打底，深色晕染外眼角</div>
            </div>
            <div className="rounded-lg bg-pink-50 p-3">
              <div className="font-medium text-pink-700">腮红：</div>
              <div className="mt-1 text-pink-600">{makeup.blushStyle}</div>
            </div>
            <div className="rounded-lg bg-pink-50 p-3">
              <div className="font-medium text-pink-700">唇色：</div>
              <div className="mt-1 text-pink-600">{makeup.lipColor}</div>
            </div>
          </div>
        </section>

        {/* Color guide */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">色彩指南</h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="text-xs text-gray-500">唇膏</div>
              <div className="mt-2 flex gap-2">
                <div className="h-12 w-12 rounded shadow-sm" style={{background: '#F97316'}} />
                <div className="h-12 w-12 rounded shadow-sm" style={{background: '#FB7185'}} />
                <div className="h-12 w-12 rounded shadow-sm" style={{background: '#FDE68A'}} />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500">腮红</div>
              <div className="mt-2 flex gap-2">
                <div className="h-12 w-12 rounded shadow-sm" style={{background: '#FBCFE8'}} />
                <div className="h-12 w-12 rounded shadow-sm" style={{background: '#FECACA'}} />
                <div className="h-12 w-12 rounded shadow-sm" style={{background: '#FDE68A'}} />
              </div>
            </div>
          </div>
        </section>

        {/* Influencer / Products */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">达人与商品推荐</h2>
          <div className="space-y-3">
            {influencers.map((inf) => (
              <div key={inf.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-pink-400 text-white flex items-center justify-center">{inf.name[0]}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-900">{inf.name}</div>
                    <div className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600">{inf.platform}</div>
                    <div className="text-xs text-gray-400">{inf.followers}</div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">匹配度 {(inf.styleMatchScore*100).toFixed(0)}%</div>
                </div>
              </div>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((p) => (
                <div key={p.id} className="rounded-lg border border-gray-100 overflow-hidden transition hover:shadow-sm">
                  <div className="h-28 bg-gradient-to-r from-teal-50 to-cyan-50"></div>
                  <div className="p-3">
                    <div className="text-xs font-medium text-teal-600">{p.brand} · {p.priceRange}</div>
                    <div className="mt-1 truncate text-sm font-medium text-gray-900">{p.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500"><span className="text-yellow-500">{'★'.repeat(Math.round(p.rating))}</span> <span>{p.rating}</span></div>
                    <div className="mt-2 text-xs text-gray-500">{p.matchReason}</div>
                    <div className="mt-3 flex justify-end">
                      <a href="#" onClick={(e)=>{e.preventDefault(); onProductClick(p.id); window.open(p.imageUrl || '#', '_blank');}} className="rounded-md bg-purple-600 px-3 py-1 text-xs text-white">购买</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="text-center text-xs text-gray-400">分析时间：{new Date(report.timestamp).toLocaleString('zh-CN')}</div>

        {!readOnly && (
          <div className="text-center">
            <button className="mt-4 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2 text-white" onClick={async ()=>{
              // call share poster API
              try{
                await fetch('/api/apps/beauty/share/poster',{method:'POST', body: JSON.stringify({ reportId: (report as any).analysisId || (report as any).analysisId })});
              }catch(e){console.warn('share api failed', e)}
            }}>生成分享海报</button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 420ms ease-out both; }
      `}</style>
    </div>
  );
}
