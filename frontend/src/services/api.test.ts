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

  describe("upload", () => {
    it("sends FormData without Content-Type header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 1 } }),
      });

      const formData = new FormData();
      formData.append("file", new Blob(["test"]), "test.txt");

      await api.upload("/upload", formData);

      const callArgs = mockFetch.mock.calls[0];
      const options = callArgs[1];
      expect(options.method).toBe("POST");
      expect(options.body).toBe(formData);
      expect(options.headers).not.toHaveProperty("Content-Type");
    });

    it("throws on failed upload", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: { message: "Upload failed" } }),
      });

      const formData = new FormData();
      formData.append("file", new Blob(["test"]), "test.txt");

      await expect(api.upload("/upload", formData)).rejects.toThrow("Upload failed");
    });

    it("throws fallback message on upload failure without message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: {} }),
      });

      const formData = new FormData();
      formData.append("file", new Blob(["test"]), "test.txt");

      await expect(api.upload("/upload", formData)).rejects.toThrow("Upload failed");
    });

    it("sets Authorization header in upload when token exists", async () => {
      localStorage.setItem("accessToken", "upload-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      const formData = new FormData();
      formData.append("file", new Blob(["test"]), "test.txt");

      await api.upload("/upload", formData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer upload-token" }),
        }),
      );
    });
  });
});
