import { useEffect, useState } from 'react';
import AdminLayout from './Layout';

export default function DevelopersAdminPage() {
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/developers')
      .then(r => r.json())
      .then((data: any) => {
        if (data.success) setDevelopers(data.data || []);
        else console.error('Load developers error:', data.code);
      })
      .catch(e => console.error('Fetch failed:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="text-center py-8">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Developer Management</h2>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500 mb-4">Manage API keys, quotas, and access for platform developers.</p>
          {developers.length === 0 ? (
            <p className="text-gray-400">No developers found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-left">Email</th>
                  <th className="py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {developers.map((d: any) => (
                  <tr key={d.id} className="border-t">
                    <td className="py-2">{d.name}</td>
                    <td className="py-2">{d.email}</td>
                    <td className="py-2">{d.status}</td>
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