import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../stores/AuthProvider";

export interface UserProfile {
    id: string;
    nickname: string;
    avatar: string | null;
    type: string;
    role: string;
    status: string;
    created_at: string;
    last_login_at: string | null;
    planName: string;
}

export interface Wallet {
    id: string;
    user_id: string;
    credits: number;
    total_used: number;
    created_at: string;
    updated_at: string;
}

export default function LoginPage() {
    const { state, loginAsGuest, refreshProfile, bindWeChat } = useAuth();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [wechatBindingUrl, setWechatBindingUrl] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("/api/auth/session");
                const data = await res.json();
                if (data.data?.authenticated) {
                    window.location.href = "/";
                } else {
                    if (!state.guestToken) {
                        await loginAsGuest();
                    }
                }
            } catch (e) {
                console.error("Auth check failed:", e);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, [state, loginAsGuest]);

    useEffect(() => {
        if (state.user) {
            fetch("/api/user/billing")
                .then(res => res.json())
                .then(data => setWallet(data.wallet || null))
                .catch(e => console.error("Wallet fetch failed:", e));
        }
    }, [state.user]);

    useEffect(() => {
        if (!state.user || state.user.type !== "guest") {
            setWechatBindingUrl(null);
            return;
        }
        const url = "/api/auth/wechat_login?state=" + state.guestToken?.userId;
        setWechatBindingUrl(url);
    }, [state.user, state.guestToken]);

    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
                <div className="w-full max-w-md text-center">
                    <p className="text-gray-500">正在初始化登录系统...</p>
                </div>
            </div>
        );
    }

    if (state.user) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
                <div className="w-full max-w-md text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-6 overflow-hidden border-2 border-indigo-500">
                        {state.user.avatar ? (
                            <img src={state.user.avatar} alt={state.user.nickname} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-4xl">{state.user.nickname.charAt(state.user.nickname.length - 1).toUpperCase()}</div>
                        )}
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">{state.user.nickname}</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        {state.user.type === "guest" ? "游客模式" : state.user.type === "wechat" ? "微信绑定" : "已登录账号"}
                    </p>
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 mb-6 border border-indigo-100">
                        <p className="text-sm text-gray-600 mb-1">Credits 余额</p>
                        <p className="text-3xl font-bold text-indigo-600">{wallet ? wallet.credits : "Loading..."}</p>
                    </div>
                    <div className="space-y-3">
                        <Link to="/" className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 transition">
                            进入平台
                        </Link>
                        <button
                            onClick={() => {
                                if (confirm("确定要退出登录吗？")) {
                                    window.location.href = "/api/auth/logout";
                                }
                            }}
                            className="w-full text-gray-500 hover:text-gray-700 py-2 px-6 rounded-lg transition"
                        >
                            退出登录
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-semibold text-gray-900 mb-2">欢迎回来</h1>
                    <p className="text-gray-500">选择一种登录方式开始体验</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-4 hover:shadow-xl transition-shadow cursor-pointer" onClick={loginAsGuest}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">👤</div>
                            <div>
                                <p className="font-medium text-gray-900">游客体验</p>
                                <p className="text-sm text-gray-500">无需注册，直接登录</p>
                            </div>
                        </div>
                        <div className="text-2xl text-gray-400">→</div>
                    </div>
                </div>
                {wechatBindingUrl && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">🎋</div>
                                <div>
                                    <p className="font-medium text-gray-900">微信绑定</p>
                                    <p className="text-sm text-gray-500">绑定微信账号，数据同步</p>
                                </div>
                            </div>
                            <div className="text-2xl text-gray-400">→</div>
                        </div>
                        <p className="mt-3 text-xs text-gray-400 text-center">点击绑定后将在新窗口打开微信授权</p>
                        <button
                            onClick={() => window.open(wechatBindingUrl, "_blank")}
                            className="w-full mt-4 bg-green-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-green-700 transition"
                        >
                            立即绑定微信
                        </button>
                    </div>
                )}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">🔐</div>
                            <div>
                                <p className="font-medium text-gray-900">登录账号</p>
                                <p className="text-sm text-gray-500">手机号/账号密码登录（功能扩展中）</p>
                            </div>
                        </div>
                        <div className="text-2xl">🔒</div>
                    </div>
                </div>
                <div className="text-center text-xs text-gray-400 mt-6">
                    <p>游客模式将自动创建临时账号</p>
                    <p className="mt-1">支持微信绑定 • 后续将扩展手机号登录</p>
                </div>
            </div>
        </div>
    );
}

