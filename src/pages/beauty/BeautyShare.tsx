import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import PluginBeautyReportView from '../../../plugins/beauty/frontend/BeautyReportView';
import type { BeautyReport } from '../../../shared/types/beauty.types';
import { analyzeBeauty } from '../../../shared/services/plugins/beauty.service';

export default function BeautySharePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<BeautyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // For public share we don't expose private user data. If we had stored reports we'd fetch them.
        // Fallback: generate a mock report to display publicly so share link still shows a report.
        const res = await analyzeBeauty({ userContext: { mock: true } });
        setReport(res.report as BeautyReport);
      } catch (e) {
        console.warn('Failed to load shared report', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">加载中…</div>;
  if (!report) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">无法加载报告</div>;

  return (
    <div>
      <PluginBeautyReportView report={report} readOnly={true} />
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <button onClick={() => navigate('/beauty')} className="rounded-lg bg-pink-500 px-4 py-2 text-white">立即测试你的AI美妆</button>
      </div>
    </div>
  );
}
