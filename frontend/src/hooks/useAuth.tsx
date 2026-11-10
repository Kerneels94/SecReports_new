/**
 * Authentication context and hook.
 * Provides AuthProvider (wrap your app) and useAuth (consume auth state).
 */
"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User, LoginRequest } from "@/types";
import { authService } from "@/services";

/** Shape of the authentication context value. */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Provides authentication state and methods (login, logout, refreshUser)
 * to all children via React context.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    // Validate the session with the refresh cookie before trusting the stored
    // access token, so logging out elsewhere ends this session on reload.
    authService
      .refreshSession()
      .then(async (session) => {
        if (cancelled) return;
        if (!session) {
          localStorage.removeItem("accessToken");
          return;
        }
        const res = await authService.me();
        if (!cancelled) setUser(res.data);
      })
      .catch(() => {
        if (!cancelled) localStorage.removeItem("accessToken");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Clear the user when another tab logs out (shared localStorage).
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "accessToken" && !event.newValue) setUser(null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // api.ts fires this when the refresh token is rejected; dropping the user sends the layouts to /login.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await authService.login(data);
    localStorage.setItem("accessToken", res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Server-side invalidation is best-effort; always clear local state
    }
    localStorage.removeItem("accessToken");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.me();
      setUser(res.data);
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Consume the AuthContext; throws if used outside AuthProvider. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
