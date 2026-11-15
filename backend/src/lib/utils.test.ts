import Fastify from "fastify";
import { generateReferenceNumber, parseTrustProxy, clientIp } from "./utils";

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


describe("parseTrustProxy", () => {
  it("defaults to localhost only", () => {
    expect(parseTrustProxy(undefined)).toBe("127.0.0.1");
  });

  it("turns a hop count into a number (Render: TRUST_PROXY=1)", () => {
    const trust = parseTrustProxy("1") as (address: string, hop: number) => boolean;
    expect(trust("10.0.0.1", 0)).toBe(true);
    expect(trust("6.6.6.6", 1)).toBe(false);
  });

  it("keeps an address list as a string", () => {
    expect(parseTrustProxy("10.0.0.0/8")).toBe("10.0.0.0/8");
  });

  it("resolves the client Render appended, ignoring a spoofed header value", async () => {
    const app = Fastify({ trustProxy: parseTrustProxy("1") });
    app.get("/", async (req) => req.ip);
    const res = await app.inject({
      url: "/",
      remoteAddress: "10.1.2.3",
      headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.7" },
    });
    expect(res.body).toBe("203.0.113.7");
  });
});

describe("clientIp", () => {
  const SECRET = "netlify-proxy-secret-for-tests";
  const jwt = require("jsonwebtoken");
  const req = (headers: Record<string, string>) => ({ ip: "10.0.0.9", headers });

  beforeEach(() => {
    process.env.NETLIFY_PROXY_SECRET = SECRET;
  });
  afterAll(() => {
    delete process.env.NETLIFY_PROXY_SECRET;
  });

  it("uses Netlify's client IP when the proxy signature verifies", () => {
    const sig = jwt.sign({ site_url: "x" }, SECRET, { issuer: "netlify" });
    expect(clientIp(req({ "x-nf-sign": sig, "x-nf-client-connection-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("ignores the header when the signature is forged", () => {
    const sig = jwt.sign({}, "attacker-secret", { issuer: "netlify" });
    expect(clientIp(req({ "x-nf-sign": sig, "x-nf-client-connection-ip": "1.2.3.4" }))).toBe("10.0.0.9");
  });

  it("ignores the header when unsigned or no secret is configured", () => {
    expect(clientIp(req({ "x-nf-client-connection-ip": "1.2.3.4" }))).toBe("10.0.0.9");
    delete process.env.NETLIFY_PROXY_SECRET;
    const sig = jwt.sign({}, SECRET, { issuer: "netlify" });
    expect(clientIp(req({ "x-nf-sign": sig, "x-nf-client-connection-ip": "1.2.3.4" }))).toBe("10.0.0.9");
  });
});
