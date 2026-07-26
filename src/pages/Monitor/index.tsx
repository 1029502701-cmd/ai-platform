import { useState, useEffect } from "react";

interface MonitorStats {
    system_health: string;
    users: { total: number; active: number };
    tasks: { total: number; active: number; pending: number; running: number; failed_today: number };
    ai_calls: { today: number; tokens: number; cost: number };
    transactions: { today_count: number; today_total: number };
    avg_response_ms: number;
}

export default function MonitorPage() {
    const [stats, setStats] = useState<MonitorStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState("");

    const loadStats = async () => {
        try {
            const res = await fetch("/api/admin/monitor/overview");
            const json: any = await res.json();; const data = json as any;
            if (json.success) {
                setStats(json.data);
                setLastUpdate(new Date().toLocaleTimeString("zh-CN"));
            } else {
                setError(json.error?.message || "Failed to load");
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Network error");
        }
    };

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const healthIcon = (status: string) => {
        if (status === "healthy") return "馃煝";
        if (status === "degraded") return "馃煛";
        return "馃敶";
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-2xl font-bold mb-6">System Monitoring</h1>

            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Last updated: {lastUpdate}</span>
                <button onClick={loadStats} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* System Health */}
            {stats && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold text-sm text-gray-600">System Health</h3>
                            <p className="text-xl mt-1">{healthIcon(stats.system_health)} {stats.system_health}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold text-sm text-gray-600">Total Users</h3>
                            <p className="text-xl mt-1">{stats.users.total.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold text-sm text-gray-600">Avg Response Time</h3>
                            <p className="text-xl mt-1">{Math.round(stats.avg_response_ms || 0)}ms</p>
                        </div>
                    </div>

                    {/* AI Calls Today */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold text-sm text-gray-600">AI Calls Today</h3>
                            <p className="text-2xl mt-1 text-indigo-600">{stats.ai_calls.today.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold text-sm text-gray-600">Tokens Used</h3>
                            <p className="text-2xl mt-1">{(stats.ai_calls.tokens / 1000).toFixed(1)}K</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold text-sm text-gray-600">Today Cost</h3>
                            <p className="text-2xl mt-1">${(stats.ai_calls.cost || 0).toFixed(4)}</p>
                        </div>
                    </div>

                    {/* Tasks */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold text-sm text-gray-600">Pending</h3>
                            <p className="text-2xl mt-1 text-yellow-600">{stats.tasks.pending}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold text-sm text-gray-600">Running</h3>
                            <p className="text-2xl mt-1 text-blue-600">{stats.tasks.running}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold text-sm text-gray-600">Active Tasks</h3>
                            <p className="text-2xl mt-1">{stats.tasks.active}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold text-sm text-gray-600">Failed Today</h3>
                            <p className="text-2xl mt-1 text-red-600">{stats.tasks.failed_today}</p>
                        </div>
                    </div>

                    {/* Revenue */}
                    <div className="bg-white p-4 rounded shadow mb-6">
                        <h3 className="font-semibold text-sm text-gray-600 mb-2">Transactions Today</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><span className="text-gray-500">Count:</span> <strong>{stats.transactions.today_count}</strong></div>
                            <div><span className="text-gray-500">Total:</span> <strong>${stats.transactions.today_total.toFixed(2)}</strong></div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
