import { useState, useEffect } from 'react';

const CATEGORIES = ['all', 'beauty', 'writing', 'office', 'education', 'marketing', 'coding', 'image', 'communication', 'business', 'utility'] as const;

interface MarketplaceApp {
  id: number; slug: string; name: string; description: string; category: string; icon_url?: string; rating: number; install_count: number; price_cents: number; version: string; author: string; status: string;
}

export default function MarketplacePage() {
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/marketplace/apps')
      .then(r => r.json())
      .then((data: any) => { setApps(data.apps || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = apps.filter(a => {
    if (category !== 'all' && a.category !== category) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !(a.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleInstall = async (slug: string) => {
    setInstalling(slug);
    try {
      const res = await fetch('/api/marketplace/apps/install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appSlug: slug }) });
      if (res.ok) setApps(prev => prev.map(a => a.slug === slug ? { ...a, install_count: a.install_count + 1 } : a));
    } finally { setInstalling(null); }
  };

  const renderStars = (rating: number) => '\u2605'.repeat(Math.round(rating)) + '\u2606'.repeat(5 - Math.round(rating));

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">AI App Marketplace</h1>
      <p className="text-gray-500 mb-8">Discover and install AI-powered applications.</p>

      <div className="flex flex-wrap gap-3 mb-8 items-center">
        <input type="text" placeholder="Search apps..." value={search} onChange={e => setSearch(e.target.value)} className="px-4 py-2 border rounded-md flex-1 min-w-[200px]" />
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1 rounded-full text-sm ${category === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No apps found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(app => (
            <div key={app.slug} className="bg-white border rounded-lg p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{app.name}</h3>
                  <span className="text-xs text-gray-500">v{app.version} \u00B7 by {app.author}</span>
                </div>
                {app.price_cents > 0 ? (
                  <span className="text-green-600 font-bold text-sm">\u00A5{(app.price_cents / 100).toFixed(2)}</span>
                ) : (
                  <span className="text-green-600 font-bold text-sm">Free</span>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{app.description}</p>
              <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
                <span>{renderStars(app.rating)}</span>
                <span>\u00B7 {app.install_count} installs</span>
                <span className="capitalize bg-gray-100 px-2 py-0.5 rounded text-xs">{app.category}</span>
              </div>
              <button onClick={() => handleInstall(app.slug)} disabled={installing === app.slug} className="w-full py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50">
                {installing === app.slug ? 'Installing...' : app.install_count > 0 ? 'Update' : 'Install'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}