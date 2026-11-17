/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS so Node runs it at postbuild untranspiled */
const { createHash } = require("crypto");
const { inlineScriptHashes, pagePaths, buildHeaders } = require("./csp-headers");

const sha = (s) => `'sha256-${createHash("sha256").update(s, "utf8").digest("base64")}'`;

it("hashes inline scripts exactly and skips external ones", () => {
  const html = '<script src="/_next/a.js"></script><script>self.__next_f.push([0])</script><script id="x">a()</script>';
  expect(inlineScriptHashes(html)).toEqual([sha("self.__next_f.push([0])"), sha("a()")]);
});

it("maps a built file to every URL Netlify serves it on", () => {
  expect(pagePaths("index.html")).toEqual(["/", "/index.html"]);
  expect(pagePaths("dashboard.html")).toEqual(["/dashboard", "/dashboard/", "/dashboard.html"]);
  expect(pagePaths("admin/users.html")).toEqual(["/admin/users", "/admin/users/", "/admin/users.html"]);
});

it("writes a strict per-page CSP with the page's hashes and no 'unsafe-inline' scripts", () => {
  const out = buildHeaders([{ file: "dashboard.html", html: "<script>boot()</script>" }]);
  expect(out).toContain("/dashboard\n  Content-Security-Policy: ");
  const csp = out.split("\n")[1];
  expect(csp).toContain(`script-src 'self' ${sha("boot()")} https://us-assets.i.posthog.com;`);
  expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  expect(csp).toContain("img-src 'self' data: https://tile.openstreetmap.org;");
});

it("refuses a page with no inline scripts: the parser broke, not the page", () => {
  expect(() => buildHeaders([{ file: "login.html", html: "<p>no scripts</p>" }])).toThrow(/login\.html/);
});
