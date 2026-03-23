'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import * as authApi from '@/lib/api/auth';

const AUTH_STORAGE_KEY = 'acbu_api_key';
const USER_ID_KEY = 'acbu_user_id';

interface AuthState {
  apiKey: string | null;
  userId: string | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (apiKey: string, userId: string) => void;
  logout: () => Promise<void>;
  setAuth: (apiKey: string | null, userId: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAuth(): AuthState {
  if (typeof window === 'undefined') {
    return { apiKey: null, userId: null, isAuthenticated: false };
  }
  const apiKey = sessionStorage.getItem(AUTH_STORAGE_KEY);
  const userId = sessionStorage.getItem(USER_ID_KEY);
  return {
    apiKey,
    userId,
    isAuthenticated: !!apiKey && !!userId,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ apiKey: null, userId: null, isAuthenticated: false });

  useEffect(() => {
    setState(getStoredAuth());
  }, []);

  const setAuth = useCallback((apiKey: string | null, userId: string | null) => {
    if (typeof window !== 'undefined') {
      if (apiKey && userId) {
        sessionStorage.setItem(AUTH_STORAGE_KEY, apiKey);
        sessionStorage.setItem(USER_ID_KEY, userId);
      } else {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(USER_ID_KEY);
      }
    }
    setState({
      apiKey,
      userId,
      isAuthenticated: !!apiKey && !!userId,
    });
  }, []);

  const login = useCallback(
    (apiKey: string, userId: string) => {
      setAuth(apiKey, userId);
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    if (state.apiKey) {
      try {
        await authApi.signout({ token: state.apiKey });
      } catch {
        // ignore network errors; clear local state anyway
      }
    }
    setAuth(null, null);
  }, [setAuth, state.apiKey]);

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
