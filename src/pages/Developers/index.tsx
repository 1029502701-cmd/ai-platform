import { useState, useEffect } from 'react';

export default function DevelopersPage() {
  const [apiKey, setApiKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ id: number; name: string; status: string; created_at: string; permissions: string[] }[]>([]);

  useEffect(() => {
    fetch('/api/developers/keys')
      .then(r => r.json())
      .then((data: any) => setApiKeys(data.keys || []))
      .catch(e => console.error('Load keys failed:', e));
  }, []);

  const handleCreateKey = async () => {
    if (!keyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/openapi/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName }),
      });
      const result = (await res.json()) as any;
      if (result.success && result.data?.rawKey) {
        setApiKey(result.data.rawKey);
        setKeyName('');
      }
    } catch (e) {
      console.error('Create key error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Developer Portal</h1>

      {/* Overview */}
      <div className="bg-white p-6 rounded-lg border mb-6">
        <h2 className="text-xl font-semibold mb-4">Get Started</h2>
        <p className="text-gray-700 mb-2">Access AI capabilities via REST API with simple authentication.</p>
        <code className="block bg-gray-100 p-3 rounded text-sm mb-2">
          POST https://ai-platform.com/openapi/v1/chat{"\n"}
          Authorization: Bearer ak_xxxx
        </code>
        <a href="/playground" className="text-blue-600 hover:underline">Playground \u00BB</a>
      </div>

      {/* Create API Key */}
      <div className="bg-white p-6 rounded-lg border mb-6">
        <h2 className="text-xl font-semibold mb-4">Create API Key</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Key name (e.g., My App)"
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
          />
          <button onClick={handleCreateKey} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Show raw key once */}
      {apiKey && (
        <div className="bg-green-50 p-6 rounded-lg border mb-6">
          <h3 className="font-semibold text-green-800 mb-2">Your API Key (save this!)</h3>
          <p className="text-sm text-green-700 mb-2">This key will never be shown again. Copy it now.</p>
          <code className="block bg-white p-3 rounded border text-sm break-all">{apiKey}</code>
        </div>
      )}

      {/* Existing Keys */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">My API Keys</h2>
        {apiKeys.length === 0 ? (
          <p className="text-gray-400">No API keys yet. Create one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-left">Created</th>
                <th className="py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k) => (
                <tr key={k.id} className="border-b">
                  <td className="py-2">{k.name}</td>
                  <td className="py-2">{new Date(k.created_at).toLocaleDateString()}</td>
                  <td className="py-2">{k.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}