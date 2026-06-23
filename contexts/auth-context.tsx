'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import * as authApi from '@/lib/api/auth';
import { onAuthError } from '@/lib/api/client';
import { clearPasscode } from '@/lib/passcode-manager';
import { logger } from '@/lib/logger';

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
  /**
   * Most recent session validation error (e.g. transient network failure).
   * 401 clears auth state and does not surface here.
   */
  sessionError: string;
  /** Re-run session validation. Useful for a Retry UI. */
  refetchSession: () => Promise<void>;
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
  const [sessionError, setSessionError] = useState('');

  // Validate session on mount by checking if the httpOnly cookie is still valid
  const validateSession = useCallback(async () => {
      const storedAuth = getStoredAuth();
      
      // If no userId in storage, definitely not authenticated
      if (!storedAuth.userId) {
        setSessionError('');
        setState({ 
          userId: null,
          stellarAddress: null,
          isAuthenticated: false,
          isHydrated: true 
        });
        return;
      }

      // Validate the httpOnly cookie by making an API call
      try {
        setSessionError('');
        const { getMe } = await import('@/lib/api/user');
        await getMe(); // If this succeeds, the cookie is valid
        
        // Cookie is valid, mark as authenticated
        setState({
          userId: storedAuth.userId,
          stellarAddress: storedAuth.stellarAddress,
          isAuthenticated: true,
          isHydrated: true,
        });
      } catch (error) {
        const status = (error as { status?: number })?.status;
        
        if (status === 401) {
          // Cookie is invalid or expired - clear stored auth
          // The onAuthError handler will also be triggered
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(USER_ID_KEY);
            sessionStorage.removeItem(STELLAR_ADDRESS_KEY);
          }
          clearPasscode();
          setSessionError('');
          setState({
            userId: null,
            stellarAddress: null,
            isAuthenticated: false,
            isHydrated: true,
          });
        } else {
          // Network error or other transient failure
          // Keep stored data but mark as not authenticated until retry succeeds
          setSessionError(error instanceof Error ? error.message : 'Failed to validate session');
          setState({
            userId: storedAuth.userId,
            stellarAddress: storedAuth.stellarAddress,
            isAuthenticated: false,
            isHydrated: true,
          });
        }
      }
    }, []);

  useEffect(() => {
    void validateSession();
  }, [validateSession]);

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
      logger.error('Failed to refresh stellar address', e);
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
    setAuth(null, null);
  }, [setAuth]);

  // Register 401 error handler: when API returns 401, clear stale auth state
  useEffect(() => {
    onAuthError(() => {
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
      sessionError,
      refetchSession: validateSession,
    }),
    [state, login, logout, setAuth, refreshStellarAddress, sessionError, validateSession]
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
