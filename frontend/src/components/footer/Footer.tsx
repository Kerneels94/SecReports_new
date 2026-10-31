import Link from "next/link";

/** Marketing site footer with product, account and company links. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Link className="brand" href="/">
              <svg className="logo-mark" aria-hidden="true">
                <use href="#i-logo" />
              </svg>
              SecReports
            </Link>
            <p>
              Incident reporting for security companies and the businesses they
              protect.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li>
                <Link href="/#features">Features</Link>
              </li>
              <li>
                <Link href="/#pricing">Pricing</Link>
              </li>
              <li>
                <Link href="/how-to">How to</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li>
                <Link href="/login">Sign in</Link>
              </li>
              <li>
                <Link href="/register">Start free trial</Link>
              </li>
              <li>
                <Link href="/forgot-password">Reset password</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li>
                <Link href="/#contact">Contact</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms">Terms &amp; Conditions</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 SecReports. All rights reserved.</span>
          <span>
            <a href="mailto:support@secreports.co.za">
              support@secreports.co.za
            </a>{" "}
            · <a href="tel:+27626496474">062 649 6474</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
