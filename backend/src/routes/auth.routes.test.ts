import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import authRoutes from "./auth.routes";

jest.mock("../controllers/auth.controller", () => ({
  AuthController: new Proxy({}, { get: () => jest.fn(async (_req: unknown, reply: { code: (n: number) => { send: (b: unknown) => void } }) => reply.code(401).send({})) }),
}));

async function app() {
  const f = Fastify();
  // Global limit high so only the per-email login limit is under test.
  await f.register(rateLimit, { max: 1000, timeWindow: "1 minute" });
  f.decorate("authenticate", async () => {});
  await f.register(authRoutes);
  return f;
}

const login = (f: Awaited<ReturnType<typeof app>>, email: string, ip: string) =>
  f.inject({ method: "POST", url: "/auth/login", remoteAddress: ip, payload: { email, password: "x" } });

describe("POST /auth/login per-email limit", () => {
  it("returns a visible 429 after 10 attempts on one email, from any IP", async () => {
    const f = await app();
    for (let i = 0; i < 10; i++) {
      // Different IPs each time: a distributed attacker is still capped per account.
      expect((await login(f, "Victim@Example.com", `10.0.0.${i}`)).statusCode).toBe(401);
    }
    const blocked = await login(f, "victim@example.com", "10.9.9.9");
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().message).toMatch(/Too many login attempts for this account/);
    // Other accounts are unaffected.
    expect((await login(f, "other@example.com", "10.9.9.9")).statusCode).toBe(401);
  });
});
