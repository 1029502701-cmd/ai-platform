import { Link } from "react-router";
import { useAuth } from "../../stores/AuthProvider";

export default function Header() {
  const auth = (() => { try { return useAuth(); } catch (e) { return null; } })() as any

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="mx-auto flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-indigo-600">AI Platform</Link>
        <nav className="flex gap-5 text-sm items-center">
          <Link to="/" className="text-gray-600 hover:text-gray-900">首页</Link>
          <Link to="/pricing" className="text-gray-600 hover:text-gray-900">定价</Link>
          <Link to="/marketplace" className="text-orange-600 hover:text-orange-800 font-medium">🛱 Marketplace</Link>
          <Link to="/developers" className="text-gray-600 hover:text-gray-900">Open API</Link>
          <Link to="/playground" className="text-blue-600 hover:text-blue-800 font-medium">Playground</Link>
          <Link to="/integrations" className="text-gray-600 hover:text-gray-900">Integrations</Link>
          <Link to="/beauty" className="text-purple-600 hover:text-purple-800 font-medium">💄 美妆分析</Link>
          {auth?.user ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{auth.user.type === 'guest' ? '访客' : '已绑定微信'}</span>
              <button onClick={() => auth.bindWeChat()} className="text-sm text-blue-600 hover:underline">绑定微信</button>
            </div>
          ) : (
            <Link to="/login" className="text-gray-600 hover:text-gray-900">登录</Link>
          )}
        </nav>
      </div>
    </header>
  );
}