"use client";

import Script from "next/script";

/** Loads public/posthog-init.js; a file, not inline, so the CSP needs no 'unsafe-inline'. */
export default function PostHogScript() {
  return <Script id="posthog" strategy="afterInteractive" src="/posthog-init.js" />;
}
