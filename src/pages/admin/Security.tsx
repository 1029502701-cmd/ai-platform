import { useEffect, useState } from 'react';
import AdminLayout from './Layout';

interface SecurityStats {
  todayLogs: { info?: number; warn?: number; error?: number };
  authFailuresToday: number;
  aiErrorsToday: number;
  recentAudits: Array<{ id: number; timestamp: string; detail: string }>;
}

export default function SecurityAdminPage() {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/security')
      .then(r => r.json())
      .then((data: any) => {
        if (data.success) setStats(data.data);
        else if (data.code) console.error('Security load error:', data.code);
      })
      .catch(e => console.error('Security load error:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <AdminLayout><div className="flex items-center justify-center h-64">Loading...</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Security Overview</h2>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Warnings Today</div>
            <div className="text-2xl font-bold text-orange-600">{stats.todayLogs.warn || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Errors Today</div>
            <div className="text-2xl font-bold text-red-600">{stats.todayLogs.error || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Auth Failures</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.authFailuresToday || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">AI Errors</div>
            <div className="text-2xl font-bold text-purple-600">{stats.aiErrorsToday || 0}</div>
          </div>
        </div>

        {/* Recent Audit Log */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-base font-semibold mb-3">Recent Audit Actions</h3>
          {stats.recentAudits.length === 0 ? (
            <p className="text-sm text-gray-400">No audit records yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Time</th>
                  <th className="py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAudits.map((a: any) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 text-gray-500">{a.timestamp}</td>
                    <td className="py-2">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

