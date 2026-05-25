'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as api from './api';

export interface AuthUser {
  name: string;
  user_id: string;
  username?: string;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isGuest: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest_] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.checkAuth();
      if (data) {
        setUser({ name: data.username, user_id: data.user_id, username: data.username, role: data.role });
        setIsGuest_(false);
        return;
      }
    } catch {}
    // Fallback: guest
    try {
      const guestStr = sessionStorage.getItem('ren_guest');
      if (guestStr) {
        const guest = JSON.parse(guestStr);
        setUser({ name: guest.name || 'Invitado', user_id: guest.user_id });
        setIsGuest_(true);
        return;
      }
    } catch {}
    setUser(null);
    setIsGuest_(false);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (username: string, password: string) => {
    await api.login(username.toLowerCase().trim(), password);
    // Re-verificar — la cookie ya la seteó el servidor
    await checkAuth();
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setIsGuest_(false);
  };

  const refreshAuth = checkAuth;

  return (
    <AuthContext.Provider value={{ user, isGuest, isLoading, isAuthenticated: !!user, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
