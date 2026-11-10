import { generateReferenceNumber, getClientIp } from "./utils";

describe("generateReferenceNumber", () => {
  it("returns a string matching INC-YYYY-XXXXXXXX pattern", () => {
    const result = generateReferenceNumber();
    const year = new Date().getFullYear();
    expect(result).toMatch(new RegExp(`^INC-${year}-[A-Z0-9]{8}$`));
  });

  it("generates unique values across 100 calls", () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(generateReferenceNumber());
    }
    expect(results.size).toBe(100);
  });
});

describe("getClientIp", () => {
  it("prefers the Cloudflare client address", () => {
    expect(
      getClientIp({
        headers: { "cf-connecting-ip": "203.0.113.7" },
        ip: "10.0.0.1",
      }),
    ).toBe("203.0.113.7");
  });

  it("falls back to request.ip without the header", () => {
    expect(getClientIp({ headers: {}, ip: "10.0.0.1" })).toBe("10.0.0.1");
  });
});
