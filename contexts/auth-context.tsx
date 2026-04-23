'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import * as authApi from '@/lib/api/auth';
import { onAuthError } from '@/lib/api/client';
import { clearPasscode } from '@/lib/passcode-manager';

const USER_ID_KEY = 'acbu_user_id';
const STELLAR_ADDRESS_KEY = 'acbu_stellar_address';

interface AuthState {
  userId: string | null;
  stellarAddress: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (userId: string, stellarAddress?: string | null) => void;
  logout: () => Promise<void>;
  setAuth: (userId: string | null, stellarAddress?: string | null) => void;
  refreshStellarAddress: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAuth(): AuthState {
  if (typeof window === 'undefined') {
    return { userId: null, stellarAddress: null, isAuthenticated: false, isHydrated: false };
  }
  const userId = sessionStorage.getItem(USER_ID_KEY);
  const stellarAddress = sessionStorage.getItem(STELLAR_ADDRESS_KEY);

  return {
    userId,
    stellarAddress,
    isAuthenticated: !!userId,
    isHydrated: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ 
    userId: null, 
    stellarAddress: null, 
    isAuthenticated: false,
    isHydrated: false,
  });

  useEffect(() => {
    const auth = getStoredAuth();
    setState(auth);
  }, []);

  const setAuth = useCallback((userId: string | null, stellarAddress: string | null = null) => {
    if (typeof window !== 'undefined') {
      if (userId) {
        sessionStorage.setItem(USER_ID_KEY, userId);
        if (stellarAddress) {
          sessionStorage.setItem(STELLAR_ADDRESS_KEY, stellarAddress);
        } else {
          sessionStorage.removeItem(STELLAR_ADDRESS_KEY);
        }
      } else {
        sessionStorage.removeItem(USER_ID_KEY);
        sessionStorage.removeItem(STELLAR_ADDRESS_KEY);
      }
    }

    setState({
      userId,
      stellarAddress,
      isAuthenticated: !!userId,
      isHydrated: true,
    });
  }, []);

  const refreshStellarAddress = useCallback(async () => {
    if (!state.isAuthenticated) return;
    try {
      const { getBalance } = await import('@/lib/api/user');
      const balance = await getBalance();
      
      if (balance.stellar_address) {
        setAuth(state.userId, balance.stellar_address);
      }
    } catch (e) {
      console.error('Failed to refresh stellar address', e);
    }
  }, [state.isAuthenticated, state.userId, setAuth]);

  const login = useCallback(
    (userId: string, stellarAddress: string | null = null) => {
      setAuth(userId, stellarAddress);
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.signout();
    } catch {
      // ignore network errors; clear local state anyway
    }
    clearPasscode(); // Clear passcode from memory
    setAuth(null, null);
  }, [setAuth]);

  // Register 401 error handler: when API returns 401, clear stale auth state
  useEffect(() => {
    onAuthError(() => {
      clearPasscode(); // Clear passcode from memory on auth error
      setAuth(null, null);
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
