import type { ReactNode } from "react";
import { useNavigate, useLocation, Outlet } from "react-router";

interface NavItem { key: string; label: string; icon: string; }
const navItems: NavItem[] = [
    { key: "/admin", label: "Dashboard", icon: "\u{1F4CA}" },
    { key: "/admin/users", label: "Users", icon: "\u{1F465}" },
    { key: "/admin/models", label: "Models", icon: "\u{1F916}" },
    { key: "/admin/tasks", label: "Tasks", icon: "\u{1F4F5}" },
    { key: "/admin/queue", label: "Queue", icon: "\u23F3" },
    { key: "/admin/prompts", label: "Prompts", icon: "\u{1F4AC}" },
    { key: "/admin/logs", label: "Logs", icon: "\u{1F4D1}" },
    { key: "/admin/developers", label: "Developers", icon: "\u{1F5A5}" },
    { key: "/admin/marketplace", label: "Marketplace", icon: "\u{1F3EC}" },
    { key: "/admin/beauty", label: "Beauty Admin", icon: "\u{1F484}" },
    { key: "/monitor", label: "System Monitor", icon: "\u{1F50D}" },
    { key: "/admin/settings", label: "Settings", icon: "\u2699\uFE0F" },
];

export default function AdminLayout({ children }: { children?: ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="flex h-screen bg-gray-100">
            <aside className="w-56 bg-slate-900 text-white flex flex-col">
                <div className="p-4 border-b border-slate-700">
                    <h2 className="font-bold text-lg">AI Platform</h2>
                    <span className="text-xs text-slate-400">Admin Console</span>
                </div>
                <nav className="flex-1 p-2 overflow-auto">
                    {navItems.map(item => {
                        const isActive = location.pathname === item.key || (item.key !== "/admin" && location.pathname.startsWith(item.key));
                        return (
                            <button key={item.key} onClick={() => navigate(item.key)}
                                className={`w-full text-left px-3 py-2 rounded mb-1 flex items-center gap-2 ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`}>
                                <span>{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>
            <main className="flex-1 overflow-auto">
                {children || <Outlet />}
            </main>
        </div>
    );
}
