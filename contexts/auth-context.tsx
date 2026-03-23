'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import * as authApi from '@/lib/api/auth';

/**
 * SECURITY: API key is now stored in httpOnly cookie (server-set, JS-inaccessible).
 * Only user_id is stored in sessionStorage as it's non-sensitive.
 * Browser automatically includes the httpOnly cookie in all API requests.
 */
const USER_ID_KEY = 'acbu_user_id';

interface AuthState {
  userId: string | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (userId: string) => void;
  logout: () => Promise<void>;
  setAuth: (userId: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAuth(): AuthState {
  if (typeof window === 'undefined') {
    return { userId: null, isAuthenticated: false };
  }
  const userId = sessionStorage.getItem(USER_ID_KEY);
  return {
    userId,
    isAuthenticated: !!userId,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ userId: null, isAuthenticated: false });

  useEffect(() => {
    setState(getStoredAuth());
  }, []);

  const setAuth = useCallback((userId: string | null) => {
    if (typeof window !== 'undefined') {
      if (userId) {
        sessionStorage.setItem(USER_ID_KEY, userId);
      } else {
        sessionStorage.removeItem(USER_ID_KEY);
      }
    }
    setState({
      userId,
      isAuthenticated: !!userId,
    });
  }, []);

  const login = useCallback(
    (userId: string) => {
      setAuth(userId);
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.signout();
    } catch {
      // ignore network errors; clear local state anyway
    }
    setAuth(null);
  }, [setAuth]);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      setAuth,
    }),
    [state, login, logout, setAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
