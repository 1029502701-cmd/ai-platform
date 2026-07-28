import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface GuestToken {
    userId: string;
    guestToken: string;
    expiresAt: string;
}

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

export interface UsageToday {
    calls: number;
    tokens: number;
    cost: number;
}

interface AuthState {
    user: UserProfile | null;
    guestToken: GuestToken | null;
    session: any | null;
    loading: boolean;
    error: string | null;
}

export const AuthContext = createContext<{
    state: AuthState;
    loginAsGuest: () => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateProfile: (data: Partial<Pick<UserProfile, 'nickname' | 'avatar'>>) => Promise<boolean>;
    isGuest: () => boolean;
    bindWeChat: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        guestToken: null,
        session: null,
        loading: true,
        error: null,
    });

    const loginAsGuest = async () => {
        try {
            const res = await fetch("/api/auth/guest", { method: "POST" });
            const data = await res.json() as any;
            if (data.success && data.data) {
                setState(prev => ({ ...prev, guestToken: data.data, user: { ...data.data, nickname: "Guest", avatar: null, type: "guest", role: "user", status: "active", planName: "free", created_at: new Date().toISOString(), last_login_at: null } }));
            }
        } catch (e) {
            console.error("Guest login failed:", e);
        }
    };

    const bindWeChat = async () => {
        if (!state.guestToken || state.user?.type !== "guest") {
            throw new Error("Only guests can bind WeChat");
        }
        try {
            const res = await fetch("/api/auth/wechat_login?state=" + state.guestToken.userId);
            const data = await res.json();
            if (data.success && data.data) {
                // After binding, refresh to get the updated user info
                await refreshProfile();
            }
        } catch (e) {
            console.error("WeChat binding failed:", e);
            throw e;
        }
    };

    const logout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch {}
        setState({ user: null, guestToken: null, session: null, loading: false, error: null });
    };

    const refreshProfile = async () => {
        try {
            let url = "/api/user/profile"; if (state.guestToken && state.guestToken.guestToken) { url += "?guestToken=" + encodeURIComponent(state.guestToken.guestToken); }; const res = await fetch(url)
            const data = await res.json() as any;
            if (data.success && data.data) {
                setState(prev => ({ ...prev, user: data.data.profile, error: null }));
            }
        } catch (e) {
            console.error("Profile load failed:", e);
        }
    };

    const updateProfile = async (updates: Partial<Pick<UserProfile, 'nickname' | 'avatar'>>) => {
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            const data = await res.json() as any;
            return data.success;
        } catch {
            return false;
        }
    };

    const isGuest = () => !!state.guestToken || state.user?.type === "guest";

    useEffect(() => {
        // Auto-login as guest on mount
        loginAsGuest();
        refreshProfile();
    }, []);

    return (
        <AuthContext.Provider value={{ state, loginAsGuest, logout, refreshProfile, updateProfile, isGuest, bindWeChat }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthProvider;

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be inside AuthProvider");
    return ctx;
}




