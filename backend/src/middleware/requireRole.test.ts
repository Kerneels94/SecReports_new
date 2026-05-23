import { requireRole } from "./requireRole";
import { ForbiddenError } from "../lib/errors";

describe("requireRole", () => {
  it("returns an async middleware function", () => {
    const middleware = requireRole("admin");
    expect(typeof middleware).toBe("function");
  });

  describe("returned middleware", () => {
    it("throws ForbiddenError when no request.user", async () => {
      const middleware = requireRole("admin");
      await expect(middleware({} as any, {} as any)).rejects.toThrow(ForbiddenError);
      await expect(middleware({} as any, {} as any)).rejects.toThrow("Authentication required");
    });

    it("throws ForbiddenError when user role is not in allowed roles", async () => {
      const middleware = requireRole("admin", "manager");
      const request = { user: { role: "reporter" } } as any;
      await expect(middleware(request, {} as any)).rejects.toThrow(ForbiddenError);
      await expect(middleware(request, {} as any)).rejects.toThrow("Insufficient permissions");
    });

    it("returns undefined when user role is in allowed roles", async () => {
      const middleware = requireRole("admin", "manager");
      const request = { user: { role: "admin" } } as any;
      const result = await middleware(request, {} as any);
      expect(result).toBeUndefined();
    });
  });
});
