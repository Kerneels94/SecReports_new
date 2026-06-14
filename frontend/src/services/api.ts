/**
 * HTTP API client wrapping fetch with token-based authentication.
 * Provides typed methods for common verbs and form-data uploads.
 */
import type { ApiResponse, ApiError, LoginRequest, LoginResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Lightweight HTTP client that prepends a base URL to every request
 * and automatically attaches the stored JWT access token.
 */
class ApiClient {
  private baseUrl: string;

  /** @param baseUrl - The base URL for all API requests (protocol + host + port). */
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /** Read the access token from localStorage (client-side only). */
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }

  /**
   * Core request dispatcher. Attaches auth and JSON headers, parses the response,
   * and throws on non-OK status codes.
   * @param path - API endpoint path (e.g. `/auth/login`)
   * @param options - Standard fetch options (method, body, headers, etc.)
   */
  private async request<T>(
    path: string,
    options: RequestInit = {},
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
    });

    if (res.status === 204) {
      return { success: true, data: undefined as unknown as T };
    }

    const json = await res.json();

    if (!res.ok) {
      const error = json as ApiError;
      throw new Error(error.error?.message || error.message || "Request failed");
    }

    return json as ApiResponse<T>;
  }

  /** Perform a GET request. */
  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "GET" });
  }

  /** Perform a POST request with an optional JSON body. */
  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /** Perform a PUT request with an optional JSON body. */
  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /** Perform a PATCH request with an optional JSON body. */
  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /** Perform a DELETE request. */
  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: "DELETE" });
  }

  /**
   * Upload a file via multipart/form-data POST.
   * Does NOT set Content-Type so the browser can set the correct boundary.
   */
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
    });

    const json = await res.json();

    if (!res.ok) {
      const error = json as ApiError;
      throw new Error(error.error?.message || error.message || "Upload failed");
    }

    return json as ApiResponse<T>;
  }
}

export const api = new ApiClient(BASE_URL);
