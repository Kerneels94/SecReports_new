/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS so Node runs it at postbuild untranspiled */
/**
 * Post-build: writes out/_headers with a per-page Content-Security-Policy whose script-src lists
 * the sha256 of each inline <script> Next put on that page. A static export can't use nonces,
 * and hashes let us drop script-src 'unsafe-inline', which also blocks injected onerror= handlers.
 *
 * The CSP lives only here, not in netlify.toml: browsers enforce every CSP header they get, so a
 * second policy there would silently tighten or confuse this one. Keep one source of truth.
 * Unknown paths are served 404.html under their own URL, so they get no CSP (static page).
 */
const { createHash } = require("crypto");
const { readdirSync, readFileSync, writeFileSync } = require("fs");
const { join, relative, sep } = require("path");

const POLICY = [
  "default-src 'self'",
  "script-src 'self' %HASHES% https://us-assets.i.posthog.com",
  // Leaflet and Recharts set inline styles.
  "style-src 'self' 'unsafe-inline'",
  // Map tiles only: an open img-src would let an injected script send the token out as an image URL.
  "img-src 'self' data: https://tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://photon.komoot.io https://us.i.posthog.com https://us-assets.i.posthog.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** sha256 source expressions for every script without a src attribute, in page order. */
function inlineScriptHashes(html) {
  const hashes = [];
  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attrs)) continue;
    hashes.push(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return hashes;
}

/** URLs Netlify serves a built HTML file on (pretty URLs, with and without the extension). */
function pagePaths(file) {
  const path = "/" + file.split(sep).join("/");
  if (path === "/index.html") return ["/", "/index.html"];
  const pretty = path.slice(0, -".html".length);
  return [pretty, `${pretty}/`, path];
}

/** _headers file content for the given pages. Throws if a page has no inline script. */
function buildHeaders(pages) {
  return pages
    .map(({ file, html }) => {
      const hashes = [...new Set(inlineScriptHashes(html))];
      // Every Next page inlines its bootstrap; none found means the regex missed them and the
      // page would ship with its own scripts blocked.
      if (hashes.length === 0) throw new Error(`csp-headers: no inline scripts found in ${file}`);
      const csp = POLICY.replace("%HASHES%", hashes.join(" "));
      return pagePaths(file).map((p) => `${p}\n  Content-Security-Policy: ${csp}\n`).join("");
    })
    .join("");
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return e.name === "_next" ? [] : htmlFiles(full);
    return e.name.endsWith(".html") ? [full] : [];
  });
}

if (require.main === module) {
  const out = join(__dirname, "..", "out");
  const pages = htmlFiles(out).map((f) => ({ file: relative(out, f), html: readFileSync(f, "utf8") }));
  writeFileSync(join(out, "_headers"), buildHeaders(pages));
  console.log(`csp-headers: wrote CSP for ${pages.length} pages`);
}

module.exports = { inlineScriptHashes, pagePaths, buildHeaders };
