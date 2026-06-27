import type { ApiResponse, ApiError, LoginResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

class ApiClient {
  private baseUrl: string;
  private refreshing: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }

  private async attemptRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) return false;

      const json = await res.json();
      const data = json.data as LoginResponse;
      localStorage.setItem("accessToken", data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  private clearTokens(): void {
    localStorage.removeItem("accessToken");
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
    });

    if (res.status === 204) {
      return { success: true, data: undefined as unknown as T };
    }

    if (res.status === 401 && !isRetry && !path.startsWith("/auth/refresh")) {
      if (!this.refreshing) {
        this.refreshing = this.attemptRefresh().finally(() => {
          this.refreshing = null;
        });
      }

      const refreshed = await this.refreshing;
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

  async upload<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });

    const json = await res.json();

    if (!res.ok) {
      const error = json as ApiError;
      throw new Error(error.error?.message || error.message || "Upload failed");
    }

    return json as ApiResponse<T>;
  }

  async downloadBlob(path: string): Promise<Blob> {
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

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Download failed: ${res.status} ${text}`);
    }

    return res.blob();
  }
}

export const api = new ApiClient(BASE_URL);
