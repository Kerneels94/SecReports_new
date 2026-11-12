import type { ApiResponse, ApiError, LoginResponse } from "@/types";

// Production is served by Netlify, which proxies /api/* to the Render backend.
// Same-origin API calls let the httpOnly SameSite=Strict refresh cookie work;
// a cross-site cookie would be dropped and every token refresh would 401.
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

class ApiClient {
  private baseUrl: string;
  private refreshing: Promise<LoginResponse | null> | null = null;
  private sessionVersion = 0;
  private refreshingVersion = 0;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        if (event.key === "accessToken" && !event.newValue) this.sessionVersion += 1;
      });
    }
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }

  /**
   * Rotates the refresh cookie for a new access token.
   * Returns null when there is no session to continue, for one of two reasons:
   *  - rejected: the server refused the cookie (400/401) for the CURRENT
   *    session. Tokens are cleared and `auth:expired` fires here.
   *  - stale: the session changed (logout or a new login) while the request
   *    was in flight. Nothing is touched, because the result belongs to a
   *    session that no longer exists and must not clear or overwrite the new one.
   * Callers must NOT clear tokens on null: this method owns that decision.
   */
  private async attemptRefresh(): Promise<LoginResponse | null> {
    const version = this.sessionVersion;
    const isStale = () => version !== this.sessionVersion;
    const refresh = async (): Promise<LoginResponse | null> => {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        // 400 (no cookie) or 401 (expired/revoked): the session is over, not a network blip.
        if (res.status === 400 || res.status === 401) {
          // A late rejection for an old session must not sign out a user who
          // has since logged in again.
          if (isStale()) return null;
          this.clearTokens();
          window.dispatchEvent(new Event("auth:expired"));
          return null;
        }
        // 5xx is transient: let callers keep the current session.
        throw new Error(`Refresh failed: ${res.status}`);
      }

      const json = await res.json();
      const data = json.data as LoginResponse;
      // A logout or another login completed while this request was in flight:
      // storing this token would put the old account's identity on the new session.
      if (isStale()) return null;
      localStorage.setItem("accessToken", data.accessToken);
      return data;
    };

    // Serialise refreshes across tabs so two tabs don't rotate the same
    // refresh token at once and trip reuse detection.
    if (typeof navigator !== "undefined" && navigator.locks) {
      return navigator.locks.request("auth-refresh", refresh);
    }
    return refresh();
  }

  private clearTokens(): void {
    this.sessionVersion += 1;
    localStorage.removeItem("accessToken");
  }

  /** Ends the local session, invalidating any refresh that is still in flight. */
  invalidateSession(): void {
    this.clearTokens();
  }

  /**
   * Starts a session after a successful login. The generation advances BEFORE
   * the token is stored, so a refresh still in flight for the previous
   * account is stale and can neither overwrite nor clear this token.
   */
  startSession(accessToken: string): void {
    this.sessionVersion += 1;
    localStorage.setItem("accessToken", accessToken);
  }

  /** Refreshes the access token, sharing one in-flight refresh between concurrent 401s. */
  private refreshShared(): Promise<LoginResponse | null> {
    // Only share a refresh that belongs to the current session; one started
    // before a login/logout is stale and would resolve to null for everyone.
    if (!this.refreshing || this.refreshingVersion !== this.sessionVersion) {
      const pending: Promise<LoginResponse | null> = this.attemptRefresh().finally(() => {
        if (this.refreshing === pending) this.refreshing = null;
      });
      this.refreshing = pending;
      this.refreshingVersion = this.sessionVersion;
    }
    return this.refreshing;
  }

  /**
   * Forces a cookie-backed refresh. Null means there is no session to
   * continue (rejected or stale); token clearing has already been handled.
   */
  refreshSession(): Promise<LoginResponse | null> {
    return this.refreshShared();
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const hasBody = options.body !== undefined && options.body !== null;
    const headers: HeadersInit = {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });

    if (res.status === 204) {
      return { success: true, data: undefined as unknown as T };
    }

    // A 401 from login means bad credentials, not an expired session: don't refresh.
    if (
      res.status === 401 &&
      !isRetry &&
      !path.startsWith("/auth/refresh") &&
      !path.startsWith("/auth/login")
    ) {
      const refreshed = await this.refreshShared();
      if (refreshed) {
        return this.request<T>(path, options, true);
      }
      // No clearTokens() here: attemptRefresh already cleared them if the
      // session was rejected, and a stale result must leave a newer session alone.
    }

    const json = await res.json();

    if (!res.ok) {
      const error = json as ApiError;
      throw new Error(error.error?.message || error.message || "Request failed");
    }

    return json as ApiResponse<T>;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "DELETE" });
  }

  async downloadBlob(path: string, isRetry = false): Promise<Blob & { filename?: string }> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (res.status === 401 && !isRetry) {
      if (await this.refreshShared()) {
        return this.downloadBlob(path, true);
      }
      // Token clearing is owned by attemptRefresh (see request()).
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Download failed: ${res.status} ${text}`);
    }

    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const blob = await res.blob();
    if (match) (blob as Blob & { filename?: string }).filename = match[1];
    return blob as Blob & { filename?: string };
  }
}

export const api = new ApiClient(BASE_URL);
