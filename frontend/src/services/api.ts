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

  private async attemptRefresh(): Promise<LoginResponse | null> {
    const version = this.sessionVersion;
    const refresh = async (): Promise<LoginResponse | null> => {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        // 400 (no cookie) or 401 (expired/revoked): the session is over, not a network blip.
        if (res.status === 400 || res.status === 401) {
          this.clearTokens();
          window.dispatchEvent(new Event("auth:expired"));
          return null;
        }
        // 5xx is transient: let callers keep the current session.
        throw new Error(`Refresh failed: ${res.status}`);
      }

      const json = await res.json();
      const data = json.data as LoginResponse;
      // A logout may have completed while this request was in flight.
      if (version !== this.sessionVersion) return null;
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

  /** Refreshes the access token, sharing one in-flight refresh between concurrent 401s. */
  private refreshShared(): Promise<LoginResponse | null> {
    if (!this.refreshing) {
      this.refreshing = this.attemptRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  /** Forces a cookie-backed refresh; returns null when the session is no longer valid. */
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

    if (res.status === 401 && !isRetry && !path.startsWith("/auth/refresh")) {
      const refreshed = await this.refreshShared();
      if (refreshed) {
        return this.request<T>(path, options, true);
      }

      this.clearTokens();
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
      this.clearTokens();
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
