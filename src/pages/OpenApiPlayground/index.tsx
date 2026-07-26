import { useState } from 'react';

export default function OpenApiPlayground() {
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('/openapi/v1/chat');
  const [body, setBody] = useState(JSON.stringify({ prompt: 'Hello', model: 'gpt-4o-mini' }, null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoints = [
    { path: '/openapi/v1/chat', method: 'POST', desc: 'Chat completion' },
    { path: '/openapi/v1/models', method: 'GET', desc: 'List available models' },
    { path: '/openapi/v1/quota', method: 'GET', desc: 'Check developer quota' },
    { path: '/openapi/v1/webhooks', method: 'GET', desc: 'List webhooks' },
  ];

  const handleTest = async () => {
    if (!apiKey) { setError('API key required'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(endpoint, {
        method: endpoint === '/openapi/v1/chat' ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: endpoint === '/openapi/v1/chat' ? body : undefined,
      });
      const data = await res.json();
      setResult({ status: res.status, data });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Open API Playground</h1>
          <p className="text-gray-500 mt-1">Test AI Platform OpenAPI endpoints interactively.</p>
        </div>

        {/* API Key */}
        <div className="bg-white rounded-lg border p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="ak_xxxxxxxxxx"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Endpoint Selection */}
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <h3 className="font-medium text-gray-900">Endpoints</h3>
          {endpoints.map(ep => (
            <button
              key={ep.path}
              onClick={() => setEndpoint(ep.path)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${endpoint === ep.path ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'hover:bg-gray-50'}`}
            >
              <span className="font-mono text-xs mr-2">{ep.method}</span>
              {ep.path} 鈥?{ep.desc}
            </button>
          ))}

          {/* Body Editor for POST */}
          {endpoint === '/openapi/v1/chat' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mt-2">Request Body</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}

          <button
            onClick={handleTest}
            disabled={!apiKey || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </div>

        {/* Result */}
        {(result || error) && (
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium text-gray-900 mb-2">Response</h3>
            {error ? (
              <pre className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</pre>
            ) : (
              <pre className="text-sm bg-gray-50 p-3 rounded text-gray-800 overflow-auto max-h-80">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}