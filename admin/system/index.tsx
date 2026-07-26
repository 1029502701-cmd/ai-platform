import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/Layout';

export default function AdminSystemPage() {
  const [envConfig, setEnvConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/system/config')
      .then(r => r.json())
      .then(d => { if (d.success) setEnvConfig(d.data || {}); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h3 className="text-base font-semibold text-gray-900">系统设置</h3>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">环境配置</h4>
          {loading ? (
            <span className="text-sm text-gray-400">加载中...</span>
          ) : (
            <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 overflow-auto max-h-64">{JSON.stringify(envConfig, null, 2)}</pre>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">AI Provider 配置</h4>
          <p className="text-sm text-gray-400">管理 OpenAI / DeepSeek API Key、默认模型、请求超时等。</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">额度规则管理</h4>
          <p className="text-sm text-gray-400">调整游客免费次数、付费用户配额上限、全局限流阈值。</p>
        </div>
      </div>
    </AdminLayout>
  );
}
