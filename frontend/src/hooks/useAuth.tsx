/**
 * Authentication context and hook.
 * Provides AuthProvider (wrap your app) and useAuth (consume auth state).
 */
"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User, LoginRequest, EmployeeLoginRequest } from "@/types";
import { authService } from "@/services";

/** Shape of the authentication context value. */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<User>;
  employeeLogin: (data: EmployeeLoginRequest) => Promise<User>;
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
    if (token) {
      authService
        .me()
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem("accessToken"))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await authService.login(data);
    localStorage.setItem("accessToken", res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const employeeLogin = useCallback(async (data: EmployeeLoginRequest) => {
    const res = await authService.employeeLogin(data);
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
    <AuthContext.Provider value={{ user, isLoading, login, employeeLogin, logout, refreshUser }}>
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
