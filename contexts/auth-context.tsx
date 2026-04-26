'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import * as authApi from '@/lib/api/auth';
import { onAuthError, setToken } from '@/lib/api/client';
import { logger } from '@/lib/logger';

const USER_ID_KEY = 'acbu_user_id';
const API_KEY_KEY = 'acbu_api_key';
const STELLAR_ADDRESS_KEY = 'acbu_stellar_address';
const PASSCODE_KEY = "acbu_passcode";

interface AuthState {
  userId: string | null;
  apiKey: string | null;
  stellarAddress: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (apiKey: string, userId: string, stellarAddress?: string | null) => void;
  logout: () => Promise<void>;
  setAuth: (apiKey: string | null, userId: string | null, stellarAddress?: string | null) => void;
  refreshStellarAddress: () => Promise<void>;
}
git checkout -b fix/f-043-remove-console-logs
const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAuth(): AuthState {
  if (typeof window === 'undefined') {
    return { userId: null, apiKey: null, stellarAddress: null, isAuthenticated: false, isHydrated: false };
  }
  const userId = sessionStorage.getItem(USER_ID_KEY);
  const apiKey = sessionStorage.getItem(API_KEY_KEY);
  const stellarAddress = sessionStorage.getItem(STELLAR_ADDRESS_KEY);
  
  if (apiKey) {
    setToken(apiKey);
  }

  return {
    apiKey,
    userId,
    stellarAddress,
    isAuthenticated: !!(userId && apiKey),
    isHydrated: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ 
    userId: null, 
    apiKey: null, 
    stellarAddress: null, 
    isAuthenticated: false,
    isHydrated: false,
  });

  useEffect(() => {
    const auth = getStoredAuth();
    setState(auth);
  }, []);

  const setAuth = useCallback((apiKey: string | null, userId: string | null, stellarAddress: string | null = null) => {
    if (typeof window !== 'undefined') {
      if (userId && apiKey) {
        sessionStorage.setItem(USER_ID_KEY, userId);
        sessionStorage.setItem(API_KEY_KEY, apiKey);
        if (stellarAddress) {
          sessionStorage.setItem(STELLAR_ADDRESS_KEY, stellarAddress);
        } else {
          sessionStorage.removeItem(STELLAR_ADDRESS_KEY);
        }
      } else {
        sessionStorage.removeItem(USER_ID_KEY);
        sessionStorage.removeItem(API_KEY_KEY);
        sessionStorage.removeItem(STELLAR_ADDRESS_KEY);
        sessionStorage.removeItem(PASSCODE_KEY);
      }
    }
    
    // Update API client token
    setToken(apiKey);

    setState({
      userId,
      apiKey,
      stellarAddress,
      isAuthenticated: !!(userId && apiKey),
      isHydrated: true,
    });
  }, []);

  const refreshStellarAddress = useCallback(async () => {
    if (!state.isAuthenticated) return;
    try {
      // We need to update stellarAddress in state. getMe currently doesn't return it based on controller logic, 
      // but let's check if we can get it from balance endpoint or if we should update getMe.
      const { getBalance } = await import('@/lib/api/user');
      const balance = await getBalance();
      
      if (balance.stellar_address) {
        setAuth(state.apiKey, state.userId, balance.stellar_address);
      }
    } catch (e) {
      logger.error('Failed to refresh stellar address', e);
    }
  }, [state.isAuthenticated, state.apiKey, state.userId, setAuth]);

  const login = useCallback(
    (apiKey: string, userId: string, stellarAddress: string | null = null) => {
      setAuth(apiKey, userId, stellarAddress);
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.signout();
    } catch {
      // ignore network errors; clear local state anyway
    }
    setAuth(null, null, null);
  }, [setAuth]);

  // Register 401 error handler: when API returns 401, clear stale auth state
  useEffect(() => {
    onAuthError(() => {
      setAuth(null, null, null);
    });
  }, [setAuth]);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      setAuth,
      refreshStellarAddress,
    }),
    [state, login, logout, setAuth, refreshStellarAddress]
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
