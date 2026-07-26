import { useState, useEffect } from "react";
import { useAuth, type GuestToken, type UserProfile, type UsageToday } from "../../stores/AuthProvider";

export default function AccountPage() {
    const { state, refreshProfile, updateProfile, logout } = useAuth()!;
    const [editing, setEditing] = useState(false);
    const [nickname, setNickname] = useState("");
    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [usageData, setUsageData] = useState<UsageToday | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const [pRes, qRes, uRes] = await Promise.all([
                fetch("/api/user/profile"),
                fetch("/api/user/quota"),
                fetch("/api/user/usage"),
            ]);
            const p = await pRes.json();
            const q = await qRes.json();
            const u = await uRes.json();
            setProfileData(p.success ? p.data.profile : null);
            setUsageData(p.success ? p.data.usageToday : null);
            setLoading(false);
        } catch {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSave = async () => {
        if (!nickname.trim()) return;
        const ok = await updateProfile({ nickname: nickname.trim() });
        if (ok) { setEditing(false); loadData(); }
    };

    const planColors: Record<string, string> = { free: "#6b7280", pro: "#3b82f6", enterprise: "#8b5cf6" };

    if (loading) return <div className="p-8 text-center">Loading account...</div>;

    const user = profileData || {};
    const gt = state.guestToken;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">My Account</h1>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
                        {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : "👤"}
                    </div>
                    <div className="flex-1">
                        {editing ? (
                            <div className="flex gap-2">
                                <input value={nickname} onChange={e => setNickname(e.target.value)} className="border rounded px-3 py-1" />
                                <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                                <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-semibold">{user.nickname || "Anonymous"}</h2>
                                <div className="flex gap-3 text-sm text-gray-500 mt-1">
                                    <span>Type: {user.type || "unknown"}</span>
                                    <span>Plan: <span style={{color: planColors[user.planName] || '#6b7280'}}>{user.planName || 'free'}</span></span>
                                </div>
                                <button onClick={() => { setNickname(user.nickname || ""); setEditing(true); }} className="text-sm text-blue-600 hover:underline mt-1">Edit nickname</button>
                            </>
                        )}
                    </div>
                </div>
                <div className="text-xs text-gray-400">
                    ID: {user.id} | Created: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                </div>
            </div>

            {/* Today's Usage */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="font-semibold mb-3">Today's Usage</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div><div className="text-2xl font-bold text-blue-600">{usageData?.calls ?? 0}</div><div className="text-xs text-gray-500">AI Calls</div></div>
                    <div><div className="text-2xl font-bold text-green-600">{usageData?.tokens ? (usageData.tokens / 1000).toFixed(1) : '0'}K</div><div className="text-xs text-gray-500">Tokens</div></div>
                    <div><div className="text-2xl font-bold text-purple-600">${(usageData?.cost ?? 0).toFixed(4)}</div><div className="text-xs text-gray-500">Cost</div></div>
                </div>
            </div>

            {/* Quota */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="font-semibold mb-3">Quotas</h3>
                <p className="text-sm text-gray-500">Quota data loads here. Currently showing daily request limit.</p>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <button onClick={logout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Logout</button>
            </div>
        </div>
    );
}