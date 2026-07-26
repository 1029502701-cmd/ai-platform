import { useState } from 'react';

const SERVICES = [
  { id: 'wechat', name: '\u5FAE\u4FE1', icon: '\uD83D\uDCDB', color: '#07C160' },
  { id: 'wecom', name: '\u4F01\u4E1A\u5FAE\u4FE1', icon: '\uD83C\uDFED', color: '#1AAD19' },
  { id: 'feishu', name: '\u98DE\u4E66', icon: '\uD83D\uDCDA', color: '#3370FF' },
  { id: 'dingtalk', name: '\u9489\u9489', icon: '\uD83D\uDCC5', color: '#0089FF' },
  { id: 'slack', name: 'Slack', icon: '\uD83D\uDD0C', color: '#4A154B' },
  { id: 'discord', name: 'Discord', icon: '\uD83C\uDFAD', color: '#5865F2' },
  { id: 'telegram', name: 'Telegram', icon: '\u2709\uFE0F', color: '#26A5E4' },
  { id: 'email', name: 'Email', icon: '\uD83D\uDFE7', color: '#666666' },
  { id: 'webhook', name: 'Webhook', icon: '\uD83D\uDD17', color: '#888888' },
];

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Record<string, string>>({});

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Integration Center</h1>
      <p className="text-gray-500 mb-8">Connect third-party services to your AI platform.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map(svc => {
          const connected = !!connections[svc.id];
          return (
            <div key={svc.id} className={`bg-white border rounded-lg p-5 ${connected ? 'border-green-300 ring-1 ring-green-100' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <span style={{ fontSize: '28px' }}>{svc.icon}</span>
                <div>
                  <h3 className="font-semibold">{svc.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">{svc.name} connector for notifications, messages, and data sync.</p>
              <button
                onClick={() => setConnections(prev => ({ ...prev, [svc.id]: prev[svc.id] ? 'disconnected' : 'connected' }))}
                style={{ backgroundColor: connected ? '#666' : svc.color }}
                className="w-full py-2 text-white rounded-md text-sm"
              >
                {connected ? 'Manage' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-10 bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">\u5C0F\u7A0B\u5E8F\u652F\u6301</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded p-4 text-center">
            <span className="text-3xl">\uD83D\uDCF1</span>
            <h3 className="font-semibold mt-2">\u5FAE\u4FE1\u5C0F\u7A0B\u5E8F</h3>
            <p className="text-sm text-gray-500 mt-1">\u5B8C\u6574\u652F\u6301 \u00B7 \u7EDF\u4E00API</p>
          </div>
          <div className="border rounded p-4 text-center opacity-50">
            <span className="text-3xl">\uD83D\uDCF1</span>
            <h3 className="font-semibold mt-2">\u652F\u4ED8\u5B9D\u5C0F\u7A0B\u5E8F</h3>
            <p className="text-sm text-gray-500 mt-1">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}