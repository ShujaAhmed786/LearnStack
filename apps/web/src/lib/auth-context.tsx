import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Organization, AuthResponse } from '@learnstack/shared';
import { apiFetch } from './api';
import { trackEvent } from './analytics';

interface AuthContextType {
  user: User | null;
  org: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string, orgSlug: string) => Promise<{ message: string; email: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Apply white-label primary color if available
  useEffect(() => {
    if (org?.primaryColor) {
      document.documentElement.style.setProperty('--primary', org.primaryColor);
    } else {
      document.documentElement.style.setProperty('--primary', '#14B8A6');
    }
  }, [org?.primaryColor]);

  const fetchCurrentUser = async () => {
    try {
      const data = await apiFetch<AuthResponse>('/v1/auth/me');
      setUser(data.user);
      setOrg(data.org);
    } catch {
      setUser(null);
      setOrg(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setOrg(data.org);
    trackEvent('login');
    return data;
  };

  const register = async (name: string, email: string, password: string, orgSlug: string) => {
    const data = await apiFetch<{ message: string; email: string }>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, orgSlug }),
    });
    return data;
  };

  const verifyEmail = async (email: string, code: string) => {
    const data = await apiFetch<AuthResponse>('/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    setUser(data.user);
    setOrg(data.org);
    trackEvent('login');
  };

  const resendCode = async (email: string) => {
    return apiFetch<{ message: string }>('/v1/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const logout = async () => {
    try {
      await apiFetch<{ success: boolean }>('/v1/auth/logout', {
        method: 'POST',
      });
    } finally {
      setUser(null);
      setOrg(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        org,
        loading,
        login,
        register,
        verifyEmail,
        resendCode,
        logout,
        refresh: fetchCurrentUser,
        refreshSession: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
