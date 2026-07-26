import { useState, useEffect } from "react";

interface SummaryData {
    total_users: number;
    active_users: number;
    guest_users: number;
    vip_users: number;
    today_new_users: number;
    ai_calls_today: number;
    ai_calls_total: number;
    ai_failed_today: number;
    tokens_today: number;
    cost_today: number;
    revenue_today: number;
    queue_pending: number;
    queue_running: number;
}

interface DashboardResponse {
    summary?: SummaryData;
    error?: string;
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/dashboard")
            .then(r => r.json())
            .then(d => { setData(d as any); setLoading(false); })
            .catch(e => { console.error("Dashboard load failed:", e); setLoading(false); });
    }, []);

    if (loading) return <div className="p-8 text-center">Loading admin data...</div>;

    const s: any = data?.summary;

    const StatCard = ({ label, value, color }: any) => (
        <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color }}>{(value ?? 0).toLocaleString()}</div>
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Admin Console 鈥?Dashboard</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Users" value={s.total_users} />
                <StatCard label="Active Users" value={s.active_users} />
                <StatCard label="Today New" value={s.today_new_users} color="#16a34a" />
                <StatCard label="VIP Users" value={s.vip_users} color="#d97706" />
                <StatCard label="AI Calls Today" value={s.ai_calls_today} color="#2563eb" />
                <StatCard label="Failed Tasks" value={s.ai_failed_today} color={s.ai_failed_today > 0 ? "#dc2626" : undefined} />
                <StatCard label="Tokens Today" value={s.tokens_today} />
                <StatCard label="Revenue Today" value={s.revenue_today} color="#059669" />
                <StatCard label="Queue Pending" value={s.queue_pending} color="#ca8a04" />
                <StatCard label="Queue Running" value={s.queue_running} color="#4f46e5" />
                <StatCard label="Cost Today" value={s.cost_today} color="#7c3aed" />
                <StatCard label="Guest Users" value={s.guest_users} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">Quick Actions</h3>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => window.location.href="/admin/users"} className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">View Users</button>
                        <button onClick={() => window.location.href="/admin/tasks"} className="px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm">Manage Tasks</button>
                        <button onClick={() => window.location.href="/admin/prompts"} className="px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm">Edit Prompts</button>
                        <button onClick={() => window.location.href="/monitor"} className="px-3 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm">System Monitor</button>
                    </div>
                </div>
                {data?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        Error: {data.error}
                    </div>
                )}
            </div>
        </div>
    );
}




