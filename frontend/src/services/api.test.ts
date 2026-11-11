import { api } from "./api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("ApiClient", () => {
  describe("request", () => {
    it("sets Content-Type: application/json only when body is present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 1 } }),
      });

      await api.post("/test", { foo: "bar" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        }),
      );
    });

    it("omits Content-Type on GET/DELETE with no body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await api.get("/no-body");
      let call = mockFetch.mock.calls[0][1];
      expect(call.headers).not.toHaveProperty("Content-Type");

      await api.delete("/no-body");
      call = mockFetch.mock.calls[1][1];
      expect(call.headers).not.toHaveProperty("Content-Type");
    });

    it("sets Authorization header when token exists", async () => {
      localStorage.setItem("accessToken", "bearer-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await api.get("/protected");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer bearer-token" }),
        }),
      );
    });

    it("throws on non-ok response with error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: { message: "Not found" } }),
      });

      await expect(api.get("/missing")).rejects.toThrow("Not found");
    });

    it("throws fallback message when no error message in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: {} }),
      });

      await expect(api.get("/fail")).rejects.toThrow("Request failed");
    });

    it("returns parsed JSON on success", async () => {
      const responseData = { success: true, data: { id: 42 } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await api.get("/success");
      expect(result).toEqual(responseData);
    });

    it("auto-refreshes token on 401 and retries", async () => {
      localStorage.setItem("accessToken", "expired-token");

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false, error: { message: "Unauthorized" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { accessToken: "new-access", refreshToken: "new-refresh", user: { id: 1, name: "A", email: "a@b.com", role: "admin", status: "active", companyId: 1 } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 42 } }),
        });

      const result = await api.get("/protected");

      expect(localStorage.getItem("accessToken")).toBe("new-access");
      expect(result).toEqual({ success: true, data: { id: 42 } });
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch.mock.calls[1][0]).toContain("/auth/refresh");
      expect(mockFetch.mock.calls[1][1].body).toBeUndefined();
      expect(mockFetch.mock.calls[1][1].headers).toBeUndefined();
    });

    it("routes refresh through navigator.locks when available", async () => {
      localStorage.setItem("accessToken", "expired-token");
      const request = jest.fn((_name: string, cb: () => Promise<boolean>) => cb());
      Object.defineProperty(navigator, "locks", {
        value: { request },
        configurable: true,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false, error: { message: "Unauthorized" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { accessToken: "new-access", refreshToken: "new-refresh", user: { id: 1, name: "A", email: "a@b.com", role: "admin", status: "active", companyId: 1 } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 42 } }),
        });

      const result = await api.get("/protected");

      expect(request).toHaveBeenCalledWith("auth-refresh", expect.any(Function));
      expect(localStorage.getItem("accessToken")).toBe("new-access");
      expect(result).toEqual({ success: true, data: { id: 42 } });

      delete (navigator as { locks?: unknown }).locks;
    });

    it("clears tokens when refresh fails on 401", async () => {
      localStorage.setItem("accessToken", "expired-token");

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false, error: { message: "Unauthorized" } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false, error: { message: "Invalid refresh" } }),
        });

      await expect(api.get("/protected")).rejects.toThrow("Unauthorized");

      expect(localStorage.getItem("accessToken")).toBeNull();
    });

    it("does not auto-refresh on /auth/refresh endpoint", async () => {
      localStorage.setItem("accessToken", "tok");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ success: false, error: { message: "Unauthorized" } }),
      });

      await expect(api.post("/auth/refresh", {})).rejects.toThrow("Unauthorized");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("HTTP methods", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });

    it("get calls request with GET method", async () => {
      await api.get("/items");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/items"),
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("post calls request with POST method and body", async () => {
      const body = { name: "test" };
      await api.post("/items", body);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/items"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    });

    it("post sends request without body when body is undefined", async () => {
      await api.post("/items");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/items"),
        expect.objectContaining({
          method: "POST",
          body: undefined,
        }),
      );
    });

    it("put calls request with PUT method and body", async () => {
      const body = { name: "updated" };
      await api.put("/items/1", body);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/items/1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(body),
        }),
      );
    });

    it("patch calls request with PATCH method and body", async () => {
      const body = { status: "resolved" };
      await api.patch("/items/1", body);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/items/1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      );
    });

    it("delete calls request with DELETE method", async () => {
      await api.delete("/items/1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/items/1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("downloadBlob", () => {
    const pdfResponse = {
      ok: true,
      status: 200,
      headers: { get: () => 'attachment; filename="incident.pdf"' },
      blob: () => Promise.resolve(new Blob(["%PDF"])),
    };

    it("auto-refreshes token on 401 and retries", async () => {
      localStorage.setItem("accessToken", "expired-token");

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 401, text: () => Promise.resolve("Unauthorized") })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { accessToken: "new-access" } }),
        })
        .mockResolvedValueOnce(pdfResponse);

      const blob = await api.downloadBlob("/export/pdf?incidentId=1");

      expect(blob.filename).toBe("incident.pdf");
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch.mock.calls[1][0]).toContain("/auth/refresh");
      expect(mockFetch.mock.calls[2][1].headers).toEqual({ Authorization: "Bearer new-access" });
    });

    it("clears tokens and throws when refresh fails on 401", async () => {
      localStorage.setItem("accessToken", "expired-token");

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 401, text: () => Promise.resolve("Unauthorized") })
        .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) });

      await expect(api.downloadBlob("/export/csv")).rejects.toThrow("Download failed: 401");
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(localStorage.getItem("accessToken")).toBeNull();
    });
  });
});

describe("ApiClient session expiry", () => {
  const unauthorized = {
    ok: false,
    status: 401,
    json: () => Promise.resolve({ success: false, error: { message: "Invalid or expired token" } }),
  };

  it.each([400, 401])("fires auth:expired when the refresh is rejected with %i", async (status) => {
    localStorage.setItem("accessToken", "expired-token");
    const onExpired = jest.fn();
    window.addEventListener("auth:expired", onExpired);
    mockFetch
      .mockResolvedValueOnce(unauthorized)
      .mockResolvedValueOnce({ ok: false, status, json: () => Promise.resolve({}) });

    await expect(api.get("/incidents")).rejects.toThrow("Invalid or expired token");
    window.removeEventListener("auth:expired", onExpired);

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("does not fire auth:expired when the refresh fails with a network error", async () => {
    localStorage.setItem("accessToken", "expired-token");
    const onExpired = jest.fn();
    window.addEventListener("auth:expired", onExpired);
    mockFetch.mockResolvedValueOnce(unauthorized).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(api.get("/incidents")).rejects.toThrow();
    window.removeEventListener("auth:expired", onExpired);

    expect(onExpired).not.toHaveBeenCalled();
  });
});

describe("ApiClient stale refresh results", () => {
  /** A fetch mock whose /auth/refresh response is released manually. */
  function deferredRefresh() {
    let release: (res: unknown) => void = () => {};
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    (global.fetch as jest.Mock) = jest.fn((url: string) =>
      url.endsWith("/auth/refresh")
        ? pending
        : Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true, data: {} }) }),
    );
    return (res: unknown) => release(res);
  }

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, "locks", { value: undefined, configurable: true });
  });

  it("does not let account A's late refresh overwrite account B's token", async () => {
    localStorage.setItem("accessToken", "token-A");
    const release = deferredRefresh();

    const refreshA = api.refreshSession();
    api.startSession("token-B");
    release({
      ok: true,
      status: 200,
      json: async () => ({ data: { accessToken: "token-A2", user: { id: 1 } } }),
    });

    await expect(refreshA).resolves.toBeNull();
    expect(localStorage.getItem("accessToken")).toBe("token-B");
  });

  it("does not sign out a newer session when an old refresh is rejected late", async () => {
    localStorage.setItem("accessToken", "token-A");
    const release = deferredRefresh();
    const onExpired = jest.fn();
    window.addEventListener("auth:expired", onExpired);

    const refreshA = api.refreshSession();
    api.invalidateSession();
    api.startSession("token-B");
    release({ ok: false, status: 401, json: async () => ({}) });

    await expect(refreshA).resolves.toBeNull();
    expect(localStorage.getItem("accessToken")).toBe("token-B");
    expect(onExpired).not.toHaveBeenCalled();
    window.removeEventListener("auth:expired", onExpired);
  });

  it("still clears tokens and fires auth:expired when the current session is rejected", async () => {
    localStorage.setItem("accessToken", "token-A");
    const release = deferredRefresh();
    const onExpired = jest.fn();
    window.addEventListener("auth:expired", onExpired);

    const refreshA = api.refreshSession();
    release({ ok: false, status: 401, json: async () => ({}) });

    await expect(refreshA).resolves.toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
    window.removeEventListener("auth:expired", onExpired);
  });
});
