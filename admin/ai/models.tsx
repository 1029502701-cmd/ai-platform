import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/Layout';
import StatCard from '../components/StatCard';
import type { AdminModelItem } from '../types';

export default function AdminModelsPage() {
  const [models, setModels] = useState<AdminModelItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/models/list')
      .then(r => r.json())
      .then(d => { if (d.success) setModels(d.data || []); })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (m: AdminModelItem) => {
    await fetch('/api/admin/models/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: m.id, enabled: !m.status.includes('active') }),
    });
    setModels(prev => prev.map(x => x.id === m.id ? { ...x, status: x.status === 'active_user' ? 'disabled' : 'active_user' } : x));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><span className="text-gray-400">加载中...</span></div>;

  const stats = { total: models.length, active: models.filter(m => m.status === 'active_user').length, disabled: models.filter(m => m.status !== 'active_user').length };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="模型总数" value={stats.total} color="blue" />
          <StatCard label="已启用" value={stats.active} color="green" />
          <StatCard label="已禁用" value={stats.disabled} color="red" />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">模型ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">优先级</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {models.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{m.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{m.provider}</td>
                  <td className="px-4 py-3">
                    <span className={inline-flex px-2 py-0.5 rounded-full text-xs font-medium }>
                      {m.status === 'active_user' ? '已启用' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{m.priority ?? '-'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(m)} className="text-sm text-blue-600 hover:text-blue-800">
                      {m.status === 'active_user' ? '禁用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
