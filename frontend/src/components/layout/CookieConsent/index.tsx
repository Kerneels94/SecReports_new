"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookieConsent";

/** Fixed bottom cookie-consent banner. Renders until visitor accepts or rejects. */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
    // Clear any non-essential storage on reject
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("ph_") || key.startsWith("_posthog")) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div className="cookie" role="dialog" aria-label="Cookie consent">
      We use cookies and analytics to improve your experience and secure your
      account. See our{" "}
      <Link href="/privacy">Privacy Policy</Link> for details.
      <div className="cookie-actions">
        <button className="btn btn-ghost btn-sm" type="button" onClick={reject}>
          Reject
        </button>
        <button className="btn btn-primary btn-sm" type="button" onClick={accept}>
          Accept
        </button>
      </div>
    </div>
  );
}
