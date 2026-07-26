import { useState, useEffect } from 'react';

export default function PlatformAdminPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/platform/tenants/list')
      .then(r => r.json())
      .then((data: any) => setTenants(data.list || []))
      .catch(() => {});
  }, []);
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Platform Admin</h1>
      <table className="w-full text-sm mt-4 border">
        <thead><tr className="border-b"><th>Name</th><th>Slug</th><th>Status</th><th>Plan</th></tr></thead>
        <tbody>{tenants.map(t => (
          <tr key={t.id} className="border-t">
            <td className="py-2">{t.name}</td>
            <td>{t.slug}</td>
            <td><span className={`px-2 py-0.5 rounded text-xs bg-green-100 text-green-700`}>{t.status}</span></td>
            <td>{t.plan}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}