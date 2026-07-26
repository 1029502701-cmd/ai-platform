import { useEffect, useState } from 'react';
import AdminLayout from '../Layout';

type App = { id: number; slug: string; name: string; category: string; status: string; rating: number; install_count: number; price_cents: number; version: string; created_at: string };

export default function AdminMarketplacePage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'apps' | 'plugins' | 'templates' | 'orders'>('apps');

  useEffect(() => {
    fetch('/api/admin/marketplace/apps')
      .then(r => r.json())
      .then((data: any) => { setApps(data.apps || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalInstalls = apps.reduce((s, a) => s + (a.install_count || 0), 0);
  const published = apps.filter(a => a.status === 'published').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Marketplace Management</h2>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4"><div className="text-2xl font-bold">{apps.length}</div><div className="text-sm text-gray-500">Total Apps</div></div>
          <div className="bg-white border rounded-lg p-4"><div className="text-2xl font-bold">{published}</div><div className="text-sm text-gray-500">Published</div></div>
          <div className="bg-white border rounded-lg p-4"><div className="text-2xl font-bold">{totalInstalls}</div><div className="text-sm text-gray-500">Total Installs</div></div>
          <div className="bg-white border rounded-lg p-4"><div className="text-2xl font-bold">{apps.length > 0 ? (apps.reduce((s: number, a: any) => s + (a.rating || 0), 0) / apps.length).toFixed(1) : "0.0"}</div><div className="text-sm text-gray-500">Avg Rating</div></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {(['apps', 'plugins', 'templates', 'orders'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm ${tab === t ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-gray-500'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'apps' && (
          <div className="bg-white rounded-lg border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : apps.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No marketplace apps yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50"><tr>
                  <th className="py-2 px-4 text-left">Name</th>
                  <th className="py-2 px-4 text-left">Category</th>
                  <th className="py-2 px-4 text-left">Status</th>
                  <th className="py-2 px-4 text-left">Rating</th>
                  <th className="py-2 px-4 text-left">Installs</th>
                  <th className="py-2 px-4 text-left">Price</th>
                </tr></thead>
                <tbody>
                  {apps.map(app => (
                    <tr key={app.slug} className="border-t">
                      <td className="py-2 px-4 font-medium">{app.name}</td>
                      <td className="py-2 px-4 capitalize">{app.category}</td>
                      <td className="py-2 px-4"><span className={`px-2 py-0.5 rounded text-xs ${app.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{app.status}</span></td>
                      <td className="py-2 px-4">{'\u2605'.repeat(Math.round(app.rating))}</td>
                      <td className="py-2 px-4">{app.install_count}</td>
                      <td className="py-2 px-4">{app.price_cents > 0 ? `Y{app.price_cents / 100}` : 'Free'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab !== 'apps' && <div className="text-center py-8 text-gray-400">{tab.charAt(0).toUpperCase() + tab.slice(1)} management coming soon.</div>}
      </div>
    </AdminLayout>
  );
}
