import jwt from "jsonwebtoken";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, REFRESH_TOKEN_TTL_MS } from "./jwt";

jest.mock("jsonwebtoken");

const payload = { userId: "1", role: "admin", companyId: "1" };

describe("signAccessToken", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("calls jwt.sign with payload, JWT_SECRET, and expiresIn 15m", () => {
    (jwt.sign as jest.Mock).mockReturnValue("access-token");
    const token = signAccessToken(payload);
    expect(jwt.sign).toHaveBeenCalledWith(payload, expect.any(String), expect.objectContaining({ expiresIn: "15m" }));
    expect(token).toBe("access-token");
  });
});

describe("signRefreshToken", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("calls jwt.sign with payload, JWT_REFRESH_SECRET, and a 12-hour expiry", () => {
    (jwt.sign as jest.Mock).mockReturnValue("refresh-token");
    const token = signRefreshToken(payload);
    expect(jwt.sign).toHaveBeenCalledWith(payload, expect.any(String), expect.objectContaining({ expiresIn: REFRESH_TOKEN_TTL_MS / 1000 }));
    expect(token).toBe("refresh-token");
  });
});

describe("verifyAccessToken", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("calls jwt.verify with token, JWT_SECRET, issuer and audience, returns payload", () => {
    (jwt.verify as jest.Mock).mockReturnValue(payload);
    const result = verifyAccessToken("some-token");
    expect(jwt.verify).toHaveBeenCalledWith(
      "some-token",
      expect.any(String),
      expect.objectContaining({ issuer: "secreports-api", audience: "secreports-client" }),
    );
    expect(result).toEqual(payload);
  });

  it("throws on invalid token", () => {
    (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error("jwt malformed"); });
    expect(() => verifyAccessToken("bad-token")).toThrow("jwt malformed");
  });
});

describe("verifyRefreshToken", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("calls jwt.verify with token, JWT_REFRESH_SECRET, issuer and audience, returns payload", () => {
    (jwt.verify as jest.Mock).mockReturnValue(payload);
    const result = verifyRefreshToken("some-token");
    expect(jwt.verify).toHaveBeenCalledWith(
      "some-token",
      expect.any(String),
      expect.objectContaining({ issuer: "secreports-api", audience: "secreports-client" }),
    );
    expect(result).toEqual(payload);
  });
});
