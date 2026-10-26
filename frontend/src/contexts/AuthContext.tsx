import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@/types';
import { loadFromStorage, saveToStorage, removeFromStorage } from '@/lib/storage';
import * as authService from '@/services/authService';
import { ApiError } from '@/services/api';

export interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  user: User | null;
  authChecked: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, role: 'customer' | 'vendor') => Promise<LoginResult>;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'phone' | 'avatar'>>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // `user` is cached in localStorage purely so the UI doesn't flash a
  // logged-out state on reload -- it's NOT how auth is determined.
  // since the access token is an httpOnly cookie invisible to
  // JS, the only reliable way to know whether a session is active is to
  // ask the server (GET /auth/me), which is what the effect below does.
  const [user, setUser] = useState<User | null>(() => loadFromStorage<User | null>('user', null));
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await authService.me();
        if (me) {
          setUser(me as User);
          saveToStorage('user', me as User);
        } else {
          setUser(null);
          removeFromStorage('user');
        }
      } catch {
        setUser(null);
        removeFromStorage('user');
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // login returns { ok, error } so UI can show the right message
  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await authService.login(email, password);
      setUser(res.user as User);
      saveToStorage('user', res.user as User);
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) return { ok: false, error: 'Incorrect email or password.' };
        if (err.status === 403) return { ok: false, error: (err.body as { message?: string })?.message ?? 'This account has been suspended.' };
        if (err.status === 429) return { ok: false, error: 'Too many attempts. Please try again in a few minutes.' };
        if (err.isNetworkError) return { ok: false, error: 'Network error — please check your connection.' };
        return { ok: false, error: err.message || 'Login failed.' };
      }
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    setUser(null);
    removeFromStorage('user');
  }, []);

  // register also returns { ok, error }
  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: 'customer' | 'vendor',
  ): Promise<LoginResult> => {
    try {
      const res = await authService.register(name, email, password, role);
      if (res?.user) {
        setUser(res.user);
        saveToStorage('user', res.user);
        return { ok: true };
      }
      return { ok: false, error: 'Registration failed. Please try again.' };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) return { ok: false, error: 'An account with this email already exists.' };
        if (err.status === 429) return { ok: false, error: 'Too many attempts. Please try again.' };
        if (err.isNetworkError) return { ok: false, error: 'Network error — please check your connection.' };
        return { ok: false, error: err.message || 'Registration failed.' };
      }
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<User, 'name' | 'phone' | 'avatar'>>) => {
    const updated = await authService.updateProfile(updates);
    setUser(updated);
    saveToStorage('user', updated);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authService.me();
    if (me) {
      setUser(me as User);
      saveToStorage('user', me as User);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, authChecked, login, logout, register, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
