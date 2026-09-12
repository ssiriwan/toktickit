import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export interface Requester {
  id: number;
  name: string;
  email: string;
}

export type UserRole = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

export interface AuthUser extends Requester {
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: AuthUser | null;
  authStatus: AuthStatus;
  login: (email: string, password: string) => Promise<{ ok: true; user: AuthUser } | { ok: false; code: string; message: string }>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ ok: true; user: AuthUser } | { ok: false; message: string; details?: { field: string; message: string }[] }>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(res: Response): Promise<{ code: string; message: string }> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  };
  return {
    code: body.error?.code ?? 'INTERNAL_ERROR',
    message: body.error?.message ?? 'Something went wrong. Please try again.'
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        setUser(null);
        setAuthStatus('anonymous');
        return;
      }
      const data = (await res.json()) as { user: AuthUser };
      setUser(data.user);
      setAuthStatus('authenticated');
    } catch {
      setUser(null);
      setAuthStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const err = await readError(res);
        return { ok: false as const, code: err.code, message: err.message };
      }
      const data = (await res.json()) as { user: AuthUser };
      setUser(data.user);
      setAuthStatus('authenticated');
      return { ok: true as const, user: data.user };
    } catch {
      return { ok: false as const, code: 'INTERNAL_ERROR', message: 'Unable to reach the server. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Still clear local state even if the request fails.
    }
    setUser(null);
    setAuthStatus('anonymous');
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });
        const body = (await res.json().catch(() => ({}))) as {
          user?: AuthUser;
          error?: { message?: string; details?: { field: string; message: string }[] };
        };
        if (!res.ok) {
          return {
            ok: false as const,
            message: body.error?.message ?? 'Failed to change password.',
            details: body.error?.details
          };
        }
        setUser(body.user as AuthUser);
        setAuthStatus('authenticated');
        return { ok: true as const, user: body.user as AuthUser };
      } catch {
        return { ok: false as const, message: 'Unable to reach the server. Please try again.' };
      }
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, authStatus, login, logout, changePassword, refresh }}>
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
