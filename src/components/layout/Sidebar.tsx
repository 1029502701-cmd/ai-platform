import { Link } from "react-router";

/** Sidebar nav — visible on admin pages */
export default function Sidebar() {
  return (
    <aside className="w-56 border-r border-gray-200 bg-gray-50 p-4">
      <nav className="space-y-1 text-sm">
        <Link to="/admin" className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-200">仪表盘</Link>
        <Link to="/admin/users" className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-200">用户管理</Link>
        <Link to="/admin/analytics" className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-200">数据分析</Link>
      </nav>
    </aside>
  );
}
