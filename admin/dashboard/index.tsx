import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/Layout';
import StatCard from '../components/StatCard';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard/stats')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <div className="flex items-center justify-center h-64"><span className="text-gray-400">加载中...</span></div>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* User stats row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="总用户数" value={stats.total_users ?? 0} icon="👥" color="blue" />
          <StatCard label="游客用户" value={stats.guest_count ?? 0} icon="🎭" color="gray" />
          <StatCard label="微信用户" value={stats.wechat_count ?? 0} icon="💬" color="green" />
          <StatCard label="VIP 用户" value={stats.vip_count ?? 0} icon="👑" color="purple" />
        </div>

        {/* AI usage stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="今日 AI 调用" value={stats.today_ai_calls ?? 0} icon="🤖" color="blue" />
          <StatCard label="累计 AI 调用" value={stats.total_ai_calls ?? 0} icon="📊" color="blue" />
          <StatCard label="失败任务" value={stats.failed_tasks ?? 0} icon="❌" color="red" />
          <StatCard label="总消耗积分" value={stats.total_credits_used ?? 0} unit="pts" icon="💰" color="amber" />
          <StatCard label="总收入" value={stats.total_revenue ?? 0} unit="CNY" icon="📈" color="green" />
        </div>

        {/* Quick links */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">快速入口</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '用户管理', path: '/admin/users', icon: '👥' },
              { label: '模型管理', path: '/admin/ai/models', icon: '🧠' },
              { label: '任务监控', path: '/admin/tasks', icon: '⏱️' },
              { label: '计费管理', path: '/admin/billing', icon: '💳' },
            ].map(link => (
              <a key={link.path} href={link.path} className="block rounded-lg border border-gray-200 p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition">
                <span className="text-2xl block mb-1">{link.icon}</span>
                <span className="text-sm font-medium text-gray-700">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
