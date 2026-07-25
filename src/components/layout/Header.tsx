import { Link } from "react-router";

/** Site header */
export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="mx-auto flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-indigo-600">
          AI Platform
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link to="/" className="text-gray-600 hover:text-gray-900">首页</Link>
          <Link to="/pricing" className="text-gray-600 hover:text-gray-900">定价</Link>
          <Link to="/beauty" className="text-purple-600 hover:text-purple-800 font-medium">🔍 美妆分析</Link>
          <Link to="/login" className="text-gray-600 hover:text-gray-900">登录</Link>
        </nav>
      </div>
    </header>
  );
}
