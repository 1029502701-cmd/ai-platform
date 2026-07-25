import React, { createContext, useContext, useEffect, useState } from 'react';

interface UserInfo {
  id: string;
  nickname?: string | null;
  type?: string | null;
}

interface AuthContextValue {
  user: UserInfo | null;
  token: string | null;
  bindWeChat: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Init: check localStorage for guestToken
    const stored = localStorage.getItem('guestToken');
    const storedUser = localStorage.getItem('guestUser');
    if (stored) {
      setToken(stored);
      try {
        setUser(storedUser ? JSON.parse(storedUser) : null);
      } catch (e) {
        setUser(null);
      }
    } else {
      // create guest session
      (async () => {
        try {
          const res = await fetch('/api/auth/guest', { method: 'POST' });
          const js = await res.json();
          if (js && js.success && js.data) {
            const t = js.data.guestToken;
            const uid = js.data.userId;
            localStorage.setItem('guestToken', t);
            localStorage.setItem('guestUser', JSON.stringify({ id: uid, nickname: null, type: 'guest' }));
            setToken(t);
            setUser({ id: uid, nickname: null, type: 'guest' });
          }
        } catch (e) {
          console.error('Guest init failed', e);
        }
      })();
    }
  }, []);

  useEffect(() => {
    // Monkey-patch fetch to attach token header for convenience
    const orig = window.fetch;
    (window as any).fetch = async (input: any, init: any = {}) => {
      init.headers = init.headers || {};
      try {
        const h = new Headers(init.headers as HeadersInit);
        if (!h.get('Authorization') && !h.get('x-guest-token') && token) {
          h.set('Authorization', `Bearer ${token}`);
        }
        init.headers = h;
      } catch (e) {}
      return orig(input, init);
    };
    return () => {
      (window as any).fetch = orig;
    };
  }, [token]);

  async function bindWeChat() {
    try {
      const res = await fetch('/api/auth/wechat_login');
      const js = await res.json();
      if (!js || !js.success || !js.data || !js.data.url) throw new Error('No wechat url');
      const callbackUrl = js.data.url;
      // Call callback directly (mock flow). In production, frontend should open the OAuth URL.
      const cb = await fetch(callbackUrl);
      const cbJson = await cb.json();
      if (cbJson && cbJson.success && cbJson.data) {
        const newToken = cbJson.data.token || cbJson.data.sessionId || cbJson.data.guestToken;
        const newUserId = cbJson.data.userId;
        if (newToken) {
          localStorage.setItem('guestToken', newToken);
          localStorage.setItem('guestUser', JSON.stringify({ id: newUserId, nickname: null, type: 'wechat' }));
          setToken(newToken);
          setUser({ id: newUserId, nickname: null, type: 'wechat' });
        }
      }
    } catch (e) {
      console.error('WeChat bind failed', e);
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, bindWeChat }}>
      {children}
    </AuthContext.Provider>
  );
}
