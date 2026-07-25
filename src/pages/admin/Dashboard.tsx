/** Admin Dashboard */
import { Link } from "react-router";

export default function AdminDashboardPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
          <p className="mt-2 text-gray-500">平台统一管理控制台</p>
        </div>

        {/* Beauty Management Section */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">美妆分析管理</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/admin/beauty/users" className="block rounded-lg border border-gray-200 p-4 text-center hover:border-purple-400 hover:bg-purple-50 transition">
              <div className="font-medium text-gray-700">用户分析</div>
              <div className="text-xs text-gray-500 mt-1">查看和管理用户美妆分析报告</div>
            </Link>
            <Link to="/admin/beauty/knowledge" className="block rounded-lg border border-gray-200 p-4 text-center hover:border-cyan-400 hover:bg-cyan-50 transition">
              <div className="font-medium text-gray-700">知识库</div>
              <div className="text-xs text-gray-500 mt-1">管理美妆知识条目和推荐规则</div>
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">系统管理</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/admin/analytics" className="block rounded-lg border border-gray-200 p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition">
              <div className="font-medium text-gray-700">数据分析</div>
            </Link>
            <Link to="/admin/billing" className="block rounded-lg border border-gray-200 p-4 text-center hover:border-green-400 hover:bg-green-50 transition">
              <div className="font-medium text-gray-700">计费管理</div>
            </Link>
            <Link to="/admin/models" className="block rounded-lg border border-gray-200 p-4 text-center hover:border-orange-400 hover:bg-orange-50 transition">
              <div className="font-medium text-gray-700">模型管理</div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}