import jwt from "jsonwebtoken";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "./jwt";

jest.mock("jsonwebtoken");

const payload = { userId: "1", role: "admin", companyId: "1" };

describe("signAccessToken", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("calls jwt.sign with payload, JWT_SECRET, and expiresIn 15m", () => {
    (jwt.sign as jest.Mock).mockReturnValue("access-token");
    const token = signAccessToken(payload);
    expect(jwt.sign).toHaveBeenCalledWith(payload, expect.any(String), { expiresIn: "15m" });
    expect(token).toBe("access-token");
  });
});

describe("signRefreshToken", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("calls jwt.sign with payload, JWT_REFRESH_SECRET, and expiresIn 7d", () => {
    (jwt.sign as jest.Mock).mockReturnValue("refresh-token");
    const token = signRefreshToken(payload);
    expect(jwt.sign).toHaveBeenCalledWith(payload, expect.any(String), { expiresIn: "7d" });
    expect(token).toBe("refresh-token");
  });
});

describe("verifyAccessToken", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("calls jwt.verify with token and JWT_SECRET, returns payload", () => {
    (jwt.verify as jest.Mock).mockReturnValue(payload);
    const result = verifyAccessToken("some-token");
    expect(jwt.verify).toHaveBeenCalledWith("some-token", expect.any(String));
    expect(result).toEqual(payload);
  });

  it("throws on invalid token", () => {
    (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error("jwt malformed"); });
    expect(() => verifyAccessToken("bad-token")).toThrow("jwt malformed");
  });
});

describe("verifyRefreshToken", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("calls jwt.verify with token and JWT_REFRESH_SECRET, returns payload", () => {
    (jwt.verify as jest.Mock).mockReturnValue(payload);
    const result = verifyRefreshToken("some-token");
    expect(jwt.verify).toHaveBeenCalledWith("some-token", expect.any(String));
    expect(result).toEqual(payload);
  });
});
