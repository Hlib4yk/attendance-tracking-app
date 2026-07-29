import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, clearToken, getToken } from '../lib/api';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  student?: {
    id: string;
    groupId: string;
    profilePhotoUrl?: string | null;
    group?: { id: string; name: string };
  };
  teacher?: { id: string };
};

type Ctx = {
  me: SessionUser | null;
  ready: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setMe(null);
      setReady(true);
      return;
    }
    try {
      const res = await apiFetch('/auth/me');
      if (!res.ok) {
        await clearToken();
        setMe(null);
        setReady(true);
        return;
      }
      const data = (await res.json()) as SessionUser;
      setMe(data);
    } catch {
      await clearToken();
      setMe(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await clearToken();
    setMe(null);
  }, []);

  const value = useMemo(() => ({ me, ready, refresh, logout }), [me, ready, refresh, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const c = useContext(SessionContext);
  if (!c) throw new Error('useSession outside SessionProvider');
  return c;
}
