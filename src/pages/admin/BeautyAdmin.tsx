import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";

interface DashboardStats {
  totalAnalyses: number;
  todayAnalyses: number;
  guestAnalyses: number;
  userAnalyses: number;
  totalBeautyAiCalls: number;
  beautyAiCost: number;
  totalAiCalls: number;
  totalAiCost: number;
  failedAiTasks: number;
  avgTaskDurationMs: number;
  failureRate: number;
}

interface AdminReport {
  id: string;
  userId: string;
  userNickname: string | null;
  userType: string | null;
  report: { faceShape: string | null; makeup: string | null; overallHarmony: number | null };
  shareImageUrl: string | null;
  imageKey: string | null;
  createdAt: string;
}

interface ReportsResponse {
  reports: AdminReport[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface AdminUserRow {
  id: string;
  nickname: string | null;
  type: string | null;
  role: string | null;
  status: string | null;
  createdAt: string;
  analysisCount: number;
  currentFaceShape: string | null;
}

interface UsersListResponse {
  users: AdminUserRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface AdminUserDetail {
  id: string;
  nickname: string | null;
  type: string | null;
  role: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface BeautyProfileDetail {
  id: string;
  user_id: string;
  avatar_url: string | null;
  current_face_shape: string | null;
  current_eye_shape: string | null;
  skin_info: string | null;
  preferred_style: string | null;
  favorite_colors: string | null;
  analysis_count: number;
  last_analysis_id: string | null;
  created_at: string;
  updated_at: string;
}

interface LastAnalysisDetail {
  id: string;
  createdAt: string;
  faceShape: string | null;
  makeup: string | null;
  harmony: number | null;
}

interface UserDetailResponse {
  user: AdminUserDetail;
  beautyProfile: BeautyProfileDetail | null;
  lastAnalysis: LastAnalysisDetail | null;
}

interface AdminAILog {
  id: string;
  userId: string;
  userNickname: string | null;
  userType: string | null;
  service: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  tokensTotal: number;
  creditsUsed: number;
  costUsd: number;
  status: string;
  transactionId: string | null;
  createdAt: string;
}

interface AILogsResponse {
  logs: AdminAILog[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: { totalCost: number; totalTokens: number; recordCount: number };
}

// ─── Sub-components ──────────────────────────────────────

const StatCard = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
  <div className="bg-white border rounded-lg p-4 shadow-sm">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-bold mt-1" style={{ color }}>{(value ?? 0).toLocaleString()}</div>
  </div>
);

const Pagination = ({ page, pageSize, total, totalPages, onPageChange }: {
  page: number; pageSize: number; total: number; totalPages: number; onPageChange: (p: number) => void;
}) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 px-2">
      <span className="text-sm text-gray-500">共 {total} 条，第 {page}/{totalPages} 页</span>
      <div className="flex gap-1">
        <button disabled={page <= 1} onClick={() => onPageChange(1)}
          className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-gray-50">首页</button>
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
          className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-gray-50">上一页</button>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}
          className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-gray-50">下一页</button>
        <button disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}
          className="px-2 py-1 text-xs border rounded disabled:opacity-30 hover:bg-gray-50">末页</button>
      </div>
    </div>
  );
};

const dateStr = (d: string | undefined) => d ? new Date(d).toLocaleString("zh-CN") : "-";

// ════════════════════════════════════════
// Reports Tab
// ════════════════════════════════════════

function ReportsTab({ page, pageSize, setPageSize, onPageChange }: { page: number; pageSize: number; setPageSize: (p: number) => void; onPageChange?: (p: number) => void }) {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ userId: "", dateFrom: "", dateTo: "", faceShape: "" });
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.faceShape) params.set("faceShape", filters.faceShape);
      const res = await fetch("/api/admin/beauty/reports?" + params.toString());
      const json = (await res.json()) as any;
      setData(json.data || json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, pageSize, filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end bg-white p-3 rounded-lg border shadow-sm">
        <div><label className="block text-xs text-gray-500">User ID</label>
          <input className="border rounded px-2 py-1 text-sm w-48" value={filters.userId}
            onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))} /></div>
        <div><label className="block text-xs text-gray-500">Date From</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} /></div>
        <div><label className="block text-xs text-gray-500">Date To</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} /></div>
        <div><label className="block text-xs text-gray-500">Face Shape</label>
          <input className="border rounded px-2 py-1 text-sm w-28" value={filters.faceShape}
            onChange={e => setFilters(f => ({ ...f, faceShape: e.target.value }))} /></div>
        <button onClick={load} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">搜索</button>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {!loading && data && (
        <>
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2">时间</th>
                  <th className="text-left px-3 py-2">用户</th>
                  <th className="text-left px-3 py-2">类型</th>
                  <th className="text-left px-3 py-2">脸型</th>
                  <th className="text-left px-3 py-2">妆容</th>
                  <th className="text-left px-3 py-2">和谐度</th>
                  <th className="text-left px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No reports found</td></tr>
                )}
                {data.reports.map(r => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{dateStr(r.createdAt)}</td>
                    <td className="px-3 py-2">{r.userNickname || r.userId.substring(0, 8)}</td>
                    <td className="px-3 py-2">{r.userType || "-"}</td>
                    <td className="px-3 py-2">{r.report.faceShape || "-"}</td>
                    <td className="px-3 py-2">{r.report.makeup || "-"}</td>
                    <td className="px-3 py-2">{r.report.overallHarmony != null ? r.report.overallHarmony.toFixed(2) : "-"}</td>
                    <td className="px-3 py-2">
                      <a href={"/beauty/report?reportId=" + r.id} target="_blank" rel="noopener noreferrer"
                        className="text-purple-600 hover:underline mr-2">查看</a>
                      <a href="/admin" className="text-blue-600 hover:underline">用户</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.pagination.page} pageSize={data.pagination.pageSize}
            total={data.pagination.total} totalPages={data.pagination.totalPages}
            onPageChange={p => onPageChange?.(p)} />
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// Users Tab
// ════════════════════════════════════════

function UsersTab({ page, pageSize, setPageSize }: { page: number; pageSize: number; setPageSize: (p: number) => void }) {
  const [listData, setListData] = useState<UsersListResponse | null>(null);
  const [detail, setDetail] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/beauty/users?page=" + page + "&pageSize=" + pageSize);
      const json = (await res.json()) as any;
      setListData(json.data || json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = async (userId: string) => {
    try {
      setSelectedUserId(userId);
      const res = await fetch("/api/admin/beauty/users?id=" + userId);
      const json = (await res.json()) as any;
      setDetail(json.data || json);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}
        {!loading && listData && (
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2">昵称</th>
                  <th className="text-left px-3 py-2">类型</th>
                  <th className="text-left px-3 py-2">角色</th>
                  <th className="text-left px-3 py-2">状态</th>
                  <th className="text-left px-3 py-2">分析数</th>
                  <th className="text-left px-3 py-2">脸型</th>
                  <th className="text-left px-3 py-2">注册</th>
                  <th className="text-left px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {listData.users.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No users found</td></tr>
                )}
                {listData.users.map(u => {
                  const isSelected = selectedUserId === u.id;
                  const rowBg = isSelected ? " bg-purple-50" : "";
                  return (
                    <tr key={u.id} className={"border-t hover:bg-gray-50" + rowBg}>
                      <td className="px-3 py-2">{u.nickname || u.id.substring(0, 8)}</td>
                      <td className="px-3 py-2">{u.type || "-"}</td>
                      <td className="px-3 py-2">{u.role || "-"}</td>
                      <td className="px-3 py-2">{u.status || "-"}</td>
                      <td className="px-3 py-2">{(u.analysisCount ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-2">{u.currentFaceShape || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{dateStr(u.createdAt)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => loadDetail(u.id)}
                          className="text-purple-600 hover:underline text-xs">详情</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && listData && (
          <Pagination page={listData.pagination.page} pageSize={listData.pagination.pageSize}
            total={listData.pagination.total} totalPages={listData.pagination.totalPages}
            onPageChange={p => setPageSize(p)} />
        )}
      </div>

      <div className="lg:col-span-1">
        {selectedUserId && detail ? (
          <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
            <h3 className="font-bold text-lg">用户详情</h3>
            <div><span className="text-gray-500 text-sm">ID:</span> <code className="text-xs">{detail.user.id}</code></div>
            <div><span className="text-gray-500 text-sm">昵称:</span> {detail.user.nickname}</div>
            <div><span className="text-gray-500 text-sm">类型:</span> {detail.user.type}</div>
            <div><span className="text-gray-500 text-sm">角色:</span> {detail.user.role}</div>
            <hr />
            {detail.beautyProfile ? (
              <>
                <h4 className="font-semibold text-sm text-purple-700 mt-2">美妆档案</h4>
                <div><span className="text-gray-500 text-sm">脸型:</span> {detail.beautyProfile.current_face_shape}</div>
                <div><span className="text-gray-500 text-sm">眼型:</span> {detail.beautyProfile.current_eye_shape}</div>
                <div><span className="text-gray-500 text-sm">皮肤:</span> {detail.beautyProfile.skin_info || "-"}</div>
                <div><span className="text-gray-500 text-sm">偏好风格:</span> {detail.beautyProfile.preferred_style || "-"}</div>
                <div><span className="text-gray-500 text-sm">颜色偏好:</span> {detail.beautyProfile.favorite_colors || "-"}</div>
                <div><span className="text-gray-500 text-sm">分析总数:</span> {detail.beautyProfile.analysis_count}</div>
              </>
            ) : (
              <p className="text-gray-400 text-sm">暂无美妆档案</p>
            )}
            {detail.lastAnalysis && (
              <>
                <hr />
                <h4 className="font-semibold text-sm text-purple-700 mt-2">最近分析</h4>
                <div><span className="text-gray-500 text-sm">时间:</span> {dateStr(detail.lastAnalysis.createdAt)}</div>
                <div><span className="text-gray-500 text-sm">脸型:</span> {detail.lastAnalysis.faceShape || "-"}</div>
                <div><span className="text-gray-500 text-sm">妆容:</span> {detail.lastAnalysis.makeup || "-"}</div>
                <div><span className="text-gray-500 text-sm">和谐度:</span> {detail.lastAnalysis.harmony != null ? detail.lastAnalysis.harmony.toFixed(2) : "-"}</div>
              </>
            )}
            {!detail.lastAnalysis && !detail.beautyProfile && (
              <p className="text-gray-400 text-sm">该用户尚未使用美妆功能</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow-sm p-8 text-center text-gray-400">
            点击左侧用户查看详情
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// AI Logs Tab
// ════════════════════════════════════════

function AILogsTab({ page, pageSize, setPageSize }: { page: number; pageSize: number; setPageSize: (p: number) => void }) {
  const [data, setData] = useState<AILogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ service: "beauty_analysis", model: "", status: "", userId: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (filters.service) params.set("service", filters.service);
      if (filters.model) params.set("model", filters.model);
      if (filters.status) params.set("status", filters.status);
      if (filters.userId) params.set("userId", filters.userId);
      const res = await fetch("/api/admin/beauty/ai-logs?" + params.toString());
      const json = (await res.json()) as any;
      setData(json.data || json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, pageSize, filters]);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (s: string) => {
    if (s === "success") return "bg-green-100 text-green-800";
    if (s === "failed") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="总成本" value={Number(data.summary.totalCost).toFixed(4)} color="#e91e63" />
          <StatCard label="总Token" value={data.summary.totalTokens} color="#9c27b0" />
          <StatCard label="记录数" value={data.summary.recordCount} color="#673ab7" />
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end bg-white p-3 rounded-lg border shadow-sm">
        <div><label className="block text-xs text-gray-500">Service</label>
          <input className="border rounded px-2 py-1 text-sm w-36" value={filters.service}
            onChange={e => setFilters(f => ({ ...f, service: e.target.value }))} /></div>
        <div><label className="block text-xs text-gray-500">Model</label>
          <input className="border rounded px-2 py-1 text-sm w-36" value={filters.model}
            onChange={e => setFilters(f => ({ ...f, model: e.target.value }))} /></div>
        <div><label className="block text-xs text-gray-500">Status</label>
          <select className="border rounded px-2 py-1 text-sm" value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">全部</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
            <option value="pending">待处理</option>
          </select></div>
        <button onClick={load} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">搜索</button>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

      {!loading && data && (
        <>
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2">时间</th>
                  <th className="text-left px-3 py-2">用户</th>
                  <th className="text-left px-3 py-2">服务</th>
                  <th className="text-left px-3 py-2">模型</th>
                  <th className="text-left px-3 py-2">Tokens</th>
                  <th className="text-left px-3 py-2">Credits</th>
                  <th className="text-left px-3 py-2">成本($)</th>
                  <th className="text-left px-3 py-2">状态</th>
                  <th className="text-left px-3 py-2">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No logs found</td></tr>
                )}
                {data.logs.map(l => (
                  <tr key={l.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{dateStr(l.createdAt)}</td>
                    <td className="px-3 py-2">{l.userNickname || l.userId.substring(0, 8)}</td>
                    <td className="px-3 py-2">{l.service}</td>
                    <td className="px-3 py-2">{l.model}</td>
                    <td className="px-3 py-2">{l.tokensTotal.toLocaleString()}</td>
                    <td className="px-3 py-2">{l.creditsUsed}</td>
                    <td className="px-3 py-2">$ + l.costUsd.toFixed(4)</td>
                    <td className="px-3 py-2">
                      <span className={"px-2 py-0.5 rounded text-xs " + statusBadge(l.status)}>{l.status}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 font-mono">{l.transactionId ? l.transactionId.substring(0, 12) + "..." : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.pagination.page} pageSize={data.pagination.pageSize}
            total={data.pagination.total} totalPages={data.pagination.totalPages}
            onPageChange={p => setPageSize(p)} />
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// Main Page
// ════════════════════════════════════════

export default function BeautyAdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/beauty/dashboard");
        if (!res.ok) throw new Error("Dashboard API failed");
        const body = (await res.json()) as any;
        setStats(body.data || body);
      } catch (e: any) {
        console.error("[BeautyAdmin] Fetch error:", e);
        setError(e.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (error && !stats) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-2 text-sm px-3 py-1 bg-red-100 rounded hover:bg-red-200">重试</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <svg className="h-8 w-8 animate-spin text-purple-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>
  );

  const TABS: [string, string][] = [["dashboard", "Dashboard"], ["reports", "Reports"], ["users", "Users"], ["logs", "AI Logs"]];

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Beauty Admin Panel</h1>
        <button onClick={() => navigate("/admin")} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 transition">
          ← Back to Admin
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b pb-0">
        {TABS.map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={"px-4 py-2 text-sm font-medium border-b-2 transition " + (
              activeTab === tab ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"
            )}>
            {label}
          </button>
        ))}
      </div>

      {stats && activeTab === "dashboard" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard label="总分析次数" value={stats.totalAnalyses} />
          <StatCard label="今日分析" value={stats.todayAnalyses} color="#22c55e" />
          <StatCard label="游客分析" value={stats.guestAnalyses} color="#f59e0b" />
          <StatCard label="登录用户分析" value={stats.userAnalyses} color="#a855f7" />
          <StatCard label="美妆 AI 调用" value={stats.totalBeautyAiCalls} color="#ec4899" />
          <StatCard label="美妆 AI 成本 ($)" value={Number(stats.beautyAiCost).toFixed(4)} color="#db2777" />
          <StatCard label="总 AI 调用" value={stats.totalAiCalls} color="#6366f1" />
          <StatCard label="总 AI 成本 ($)" value={Number(stats.totalAiCost).toFixed(4)} color="#4f46e5" />
          <StatCard label="失败任务" value={stats.failedAiTasks} color="#ef4444" />
          <StatCard label="平均耗时 (ms)" value={Math.round(stats.avgTaskDurationMs)} color="#14b8a6" />
          <StatCard label="失败率 (%)" value={stats.failureRate} color="#f97316" />
        </div>
      )}

      {activeTab === "reports" && (
        <ReportsTab page={currentPage} pageSize={pageSize} setPageSize={setPageSize} />
      )}
      {activeTab === "users" && (
        <UsersTab page={currentPage} pageSize={pageSize} setPageSize={setPageSize} />
      )}
      {activeTab === "logs" && (
        <AILogsTab page={currentPage} pageSize={pageSize} setPageSize={setPageSize} />
      )}
    </div>
  );
}
