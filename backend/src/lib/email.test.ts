import dns from "dns/promises";
import { acceptsMail } from "./email";

jest.mock("dns/promises", () => ({
  __esModule: true,
  default: { resolveMx: jest.fn(), resolve4: jest.fn(), resolve6: jest.fn() },
}));

const resolveMx = dns.resolveMx as jest.Mock;
const resolve4 = dns.resolve4 as jest.Mock;
const resolve6 = dns.resolve6 as jest.Mock;

function dnsError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

// Each test uses its own domain: results are cached per domain.
describe("acceptsMail", () => {
  beforeEach(() => jest.resetAllMocks());

  it("accepts a domain with MX records", async () => {
    resolveMx.mockResolvedValue([{ exchange: "mx.example.com", priority: 10 }]);

    await expect(acceptsMail("a@with-mx.test")).resolves.toBe(true);
    expect(resolve4).not.toHaveBeenCalled();
  });

  it("accepts a domain with no MX but an A record (implicit MX)", async () => {
    resolveMx.mockRejectedValue(dnsError("ENODATA"));
    resolve4.mockResolvedValue(["203.0.113.10"]);

    await expect(acceptsMail("a@implicit-a.test")).resolves.toBe(true);
  });

  it("accepts a domain with no MX and only an AAAA record", async () => {
    resolveMx.mockRejectedValue(dnsError("ENODATA"));
    resolve4.mockRejectedValue(dnsError("ENODATA"));
    resolve6.mockResolvedValue(["2001:db8::1"]);

    await expect(acceptsMail("a@implicit-aaaa.test")).resolves.toBe(true);
  });

  it("rejects a domain with no MX and no address records", async () => {
    resolveMx.mockRejectedValue(dnsError("ENODATA"));
    resolve4.mockRejectedValue(dnsError("ENODATA"));
    resolve6.mockRejectedValue(dnsError("ENODATA"));

    await expect(acceptsMail("a@no-records.test")).resolves.toBe(false);
  });

  it("rejects a domain that publishes a null MX (RFC 7505)", async () => {
    resolveMx.mockResolvedValue([{ exchange: "", priority: 0 }]);

    await expect(acceptsMail("a@null-mx.test")).resolves.toBe(false);
    expect(resolve4).not.toHaveBeenCalled();
  });

  it("rejects a domain that does not exist", async () => {
    resolveMx.mockRejectedValue(dnsError("ENOTFOUND"));

    await expect(acceptsMail("a@missing.test")).resolves.toBe(false);
  });

  it("does not cache a transient DNS failure", async () => {
    resolveMx.mockRejectedValueOnce(dnsError("ETIMEOUT"));
    await expect(acceptsMail("a@flaky.test")).resolves.toBe(false);

    resolveMx.mockResolvedValueOnce([{ exchange: "mx.flaky.test", priority: 10 }]);
    await expect(acceptsMail("a@flaky.test")).resolves.toBe(true);
  });

  it("rejects an address with no domain", async () => {
    await expect(acceptsMail("no-at-sign")).resolves.toBe(false);
  });
});
