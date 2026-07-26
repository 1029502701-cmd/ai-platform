import { useEffect, useState } from 'react';
import { useParams, useNavigate } from "react-router";
import PluginBeautyReportView from '../../../plugins/beauty/frontend/BeautyReportView';
import type { BeautyReport } from '../../../shared/types/beauty.types';

export default function BeautySharePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<BeautyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Fetch the actual stored report via the share API endpoint
        const res = await fetch(`/api/apps/beauty/report/${id}?share=1`);
        if (!res.ok) throw new Error('Report not found or access denied');
        const json: any = await res.json();
        if (!json.success || !json.data?.report) throw new Error('Failed to load report data');
        setReport(json.data.report as BeautyReport);
      } catch (e: any) {
        console.warn('[BeautyShare] Failed to load:', e.message);
        setError(e.message || 'Failed to load shared report');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">加载中…</div>;
  if (error) return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 mb-2">⚠️ {error}</p>
        <button onClick={() => navigate('/beauty')} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">返回首页</button>
      </div>
    </div>
  );
  if (!report) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><p className="text-gray-500">无法加载报告</p></div>;

  return (
    <div>
      <PluginBeautyReportView report={report} readOnly={true} />
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <button onClick={() => navigate('/beauty')} className="rounded-lg bg-pink-500 px-4 py-2 text-white">立即测试你的AI美妆</button>
      </div>
    </div>
  );
}
