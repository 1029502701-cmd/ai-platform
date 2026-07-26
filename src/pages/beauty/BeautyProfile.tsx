import { useEffect, useState } from 'react';

export default function BeautyProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetch('/api/apps/beauty/profile');
        const pj: any = await p.json();
        if (pj && pj.success) setProfile(pj.data);
      } catch (e) {}
      try {
        const h = await fetch('/api/apps/beauty/history');
        const hj: any = await h.json();
        if (hj && hj.success) setHistory(hj.data || []);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const styleCounts = history.reduce((acc: any, it: any) => {
    const s = (it.style_result || 'unknown');
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">我的美妆画像</h1>
      {loading && <div>加载中...</div>}
      {!loading && (
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-2">当前画像</h2>
            {profile ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div>脸型：{profile.current_face_shape || '-'}</div>
                  <div>眼型：{profile.current_eye_shape || '-'}</div>
                  <div>肤质信息：{profile.skin_info || '-'}</div>
                </div>
                <div>
                  <div>偏好风格：{profile.preferred_style || '-'}</div>
                  <div>喜爱颜色：{profile.favorite_colors || '-'}</div>
                  <div>分析次数：{profile.analysis_count || 0}</div>
                </div>
              </div>
            ) : (
              <div>尚无画像，上传并分析一张照片以创建个人画像。</div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-2">分析历史</h2>
            {history.length === 0 && <div className="text-sm text-gray-500">暂无历史记录</div>}
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b py-2 text-sm">
                <div>{new Date(h.created_at).toLocaleString('zh-CN')}</div>
                <div className="text-gray-700">风格：{h.style_result || '-'}</div>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold mb-2">风格变化统计</h2>
            <div className="flex gap-3 items-end h-24">
              {Object.entries(styleCounts).map(([k,v]) => (
                <div key={k} className="flex flex-col items-center">
                                <div className="w-8 bg-purple-500" style={{height: Math.min(160, (v as number) * 16)}} />
                  <div className="text-xs mt-1">{k}</div>
                </div>
              ))}
              {Object.keys(styleCounts).length === 0 && <div className="text-sm text-gray-500">暂无足够数据</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
