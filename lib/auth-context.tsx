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
  // Inicialización síncrona: detectar guest en sessionStorage ANTES del primer render
  // Esto evita el bug donde checkAuth() se ejecuta antes de que el guest exista
  const [initialGuest] = useState<{ name?: string; user_id: string } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const g = sessionStorage.getItem('ren_guest');
        if (g) return JSON.parse(g);
      } catch {}
    }
    return null;
  });

  const [user, setUser] = useState<AuthUser | null>(
    initialGuest ? { name: initialGuest.name || 'Invitado', user_id: initialGuest.user_id } : null
  );
  const [isGuest, setIsGuest_] = useState<boolean>(!!initialGuest);
  const [isLoading, setIsLoading] = useState(!initialGuest);

    const checkAuth = useCallback(async () => {
    setIsLoading(true);
    
    // 1. Check guest FIRST — sin server call, instantáneo
    try {
      const guestStr = sessionStorage.getItem('ren_guest');
      if (guestStr) {
        const guest = JSON.parse(guestStr);
        setUser({ name: guest.name || 'Invitado', user_id: guest.user_id });
        setIsGuest_(true);
        setIsLoading(false);
        return;
      }
    } catch {}

    // 2. No guest — intentar auth vía servidor
    try {
      const data = await api.checkAuth();
      if (data) {
        setUser({ name: data.username, user_id: data.user_id, username: data.username, role: data.role });
        setIsGuest_(false);
        setIsLoading(false);
        return;
      }
    } catch {}

    // 3. Sin sesión de ningún tipo
    setUser(null);
    setIsGuest_(false);
    setIsLoading(false);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Escuchar creación de guest desde landing/login (cuando AuthProvider ya está montado)
  useEffect(() => {
    const handler = () => {
      try {
        const g = sessionStorage.getItem('ren_guest');
        if (g) {
          const guest = JSON.parse(g);
          setUser({ name: guest.name || 'Invitado', user_id: guest.user_id });
          setIsGuest_(true);
          setIsLoading(false);
        }
      } catch {}
    };
    window.addEventListener('ren:guest-created', handler);
    return () => window.removeEventListener('ren:guest-created', handler);
  }, []);

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
