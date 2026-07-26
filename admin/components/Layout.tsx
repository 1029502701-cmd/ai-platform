import React from 'react';
import { Link, useLocation } from 'react-router';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin' },
  { label: '用户管理', path: '/admin/users' },
  { label: 'AI 模型', path: '/admin/ai/models' },
  { label: '场景管理', path: '/admin/ai/scenarios' },
  { label: '任务监控', path: '/admin/tasks' },
  { label: '计费管理', path: '/admin/billing' },
  { label: '美妆管理', path: '/admin/beauty' },
  { label: '联盟系统', path: '/admin/alliance' },
  { label: '系统设置', path: '/admin/system' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 mb-2 block">← 返回前台</Link>
          <h1 className="text-lg font-bold text-gray-900">管理后台</h1>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={lock px-3 py-2 rounded-md text-sm transition }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <Link to="/chat" className="text-sm text-gray-500 hover:text-gray-700 block py-1">使用 AI 功能</Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{NAV_ITEMS.find(i => {
            if (i.path === '/admin') return location.pathname === '/admin';
            return location.pathname.startsWith(i.path);
          })?.label || '管理后台'}</h2>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
