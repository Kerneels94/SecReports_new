/**
 * Authentication context and hook.
 * Provides AuthProvider (wrap your app) and useAuth (consume auth state).
 */
"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
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
  const sessionEpoch = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const epoch = sessionEpoch.current;
    const isCurrent = () => !cancelled && epoch === sessionEpoch.current;

    // Validate the session with the refresh cookie before trusting the stored
    // access token, so logging out elsewhere ends this session on reload.
    authService
      .refreshSession()
      .then(async (session) => {
        // No session: api.ts has already cleared the token if the server
        // rejected it, and left it alone if a newer session took over.
        if (!isCurrent() || !session) return;
        // A successful refresh IS the authenticated session, so show the user
        // now instead of waiting on a second request that may fail.
        setUser(session.user);
        try {
          // me() adds trial status. If it fails, keep the user we already have:
          // a failed profile probe is not a sign-out.
          const res = await authService.me();
          if (isCurrent()) setUser(res.data);
        } catch {
          // keep session.user
        }
      })
      .catch(async () => {
        if (!isCurrent()) return;
        // A transient refresh failure does not end the session: keep the token
        // and fall back to the access token we already have.
        try {
          const res = await authService.me();
          if (isCurrent()) setUser(res.data);
        } catch {
          // Transport failure: keep the token so the next reload can retry.
          // If the server really rejected the session, api.ts has already
          // cleared the token and fired auth:expired.
        }
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
      if (event.key === "accessToken" && !event.newValue) {
        sessionEpoch.current += 1;
        setUser(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // api.ts fires this when the refresh token is rejected; dropping the user sends the layouts to /login.
  useEffect(() => {
    const onExpired = () => {
      sessionEpoch.current += 1;
      setUser(null);
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await authService.login(data);
    sessionEpoch.current += 1;
    // startSession (not a bare localStorage write) so a refresh still in
    // flight for a previous account cannot overwrite or clear this token.
    authService.startSession(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Server-side invalidation is best-effort; always clear local state
    }
    sessionEpoch.current += 1;
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
