/**
 * Landing / home page — marketing page with hero, features, pricing, FAQ
 * and contact sections.
 * @route /
 */
import Link from "next/link";
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";
import CookieConsent from "@/components/layout/CookieConsent";
import ContactSection from "@/components/contact/ContactSection";
import { SiteIcons } from "@/components/site/SiteIcons";

export default function LandingPage() {
  return (
    <div className="site-redesign">
      <SiteIcons />
      <Header />
      <CookieConsent />
      <main>
        <section className="hero grid-glow">
          <div className="wrap hero-grid">
            <div>
              <span className="eyebrow">
                <span className="dot" />
                Incident reporting for private security
              </span>
              <h1>
                Every incident on record.{" "}
                <span className="grad">Every client in the loop.</span>
              </h1>
              <p className="lead">
                SecReports gives security companies — and the businesses they
                protect — one place to log call-outs, measure response times and
                send professional incident reports. Every report gets an
                auto-generated reference number and stays searchable and
                exportable.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary" href="/register">
                  Start 14-day free trial{" "}
                  <svg className="icon icon-sm" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </Link>
                <Link className="btn btn-ghost" href="/#how-it-works">
                  See how it works
                </Link>
              </div>
              <ul className="hero-checks">
                <li>
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-check" />
                  </svg>
                  No credit card required
                </li>
                <li>
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-check" />
                  </svg>
                  Up to 3 users on the trial
                </li>
                <li>
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-check" />
                  </svg>
                  Priced in Rand
                </li>
              </ul>
            </div>

            <figure
              className="hero-visual"
              style={{ margin: 0 }}
              aria-label="Example incident report in SecReports"
            >
              <div className="float float-stat">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-chart" />
                  </svg>
                </span>
                <span>
                  12 attempted · 5 positive<small>This month</small>
                </span>
              </div>
              <article className="report">
                <header className="report-head">
                  <div>
                    <p className="report-label">Incident report</p>
                    <p className="report-ref">#SR-2026-0418</p>
                  </div>
                  <span className="chip chip-positive">Positive</span>
                </header>
                <dl className="fields">
                  <div>
                    <dt>Operator</dt>
                    <dd>T. Mokoena</dd>
                  </div>
                  <div>
                    <dt>Dispatcher</dt>
                    <dd>L. Botha</dd>
                  </div>
                  <div>
                    <dt>Call sign</dt>
                    <dd className="mono">ALPHA-3</dd>
                  </div>
                  <div>
                    <dt>SAPS reference</dt>
                    <dd className="mono">CAS 214/10/2026</dd>
                  </div>
                  <div className="field-wide">
                    <dt>Property</dt>
                    <dd>12 Kiaat Road, Zwartkop, Centurion</dd>
                  </div>
                  <div className="field-wide">
                    <dt>Client</dt>
                    <dd>Riverside Business Park</dd>
                  </div>
                </dl>
                <div className="response">
                  <div className="response-times">
                    <span>
                      Dispatched <b className="mono">02:14</b>
                    </span>
                    <span>
                      Arrived <b className="mono">02:21</b>
                    </span>
                  </div>
                  <div className="response-bar">
                    <span />
                  </div>
                  <p className="response-total">
                    <svg className="icon icon-sm" aria-hidden="true">
                      <use href="#i-clock" />
                    </svg>
                    7 min response
                  </p>
                </div>
                <div className="report-actions" aria-hidden="true">
                  <span className="btn btn-ghost btn-sm">
                    <svg className="icon icon-sm">
                      <use href="#i-download" />
                    </svg>
                    PDF
                  </span>
                  <span className="btn btn-primary btn-sm">
                    <svg className="icon icon-sm">
                      <use href="#i-send" />
                    </svg>
                    Email client
                  </span>
                </div>
              </article>
              <div className="float float-toast">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-check" />
                  </svg>
                </span>
                <span>
                  PDF emailed to client
                  <small>Riverside Business Park · just now</small>
                </span>
              </div>
            </figure>
          </div>
        </section>

        <div className="strip">
          <div className="wrap strip-grid">
            <div className="strip-item">
              <svg className="icon" aria-hidden="true">
                <use href="#i-hash" />
              </svg>
              <div>
                <strong>Auto reference numbers</strong>
                <span>On every incident</span>
              </div>
            </div>
            <div className="strip-item">
              <svg className="icon" aria-hidden="true">
                <use href="#i-clock" />
              </svg>
              <div>
                <strong>Dispatch → arrival</strong>
                <span>Response times tracked</span>
              </div>
            </div>
            <div className="strip-item">
              <svg className="icon" aria-hidden="true">
                <use href="#i-file" />
              </svg>
              <div>
                <strong>SAPS case numbers</strong>
                <span>Captured with the report</span>
              </div>
            </div>
            <div className="strip-item">
              <svg className="icon" aria-hidden="true">
                <use href="#i-download" />
              </svg>
              <div>
                <strong>PDF &amp; CSV export</strong>
                <span>One incident or all of them</span>
              </div>
            </div>
          </div>
        </div>

        <div className="section" id="solutions">
          <div className="wrap">
            <div className="section-head">
              <p className="kicker">Who it&apos;s for</p>
              <h2>
                Built for the teams that respond — and the businesses that rely
                on them
              </h2>
              <p>
                Whether you run a control room or protect your own premises,
                SecReports turns every call-out into a clear, defensible record.
              </p>
            </div>
            <div className="audience">
              <article className="card aud-card">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-radio" />
                  </svg>
                </span>
                <h3>Security companies</h3>
                <p className="aud-for">
                  Armed response · Guarding · Patrol · Control rooms
                </p>
                <p className="aud-pitch">
                  Show clients exactly what you did, when you did it, and how
                  fast you got there.
                </p>
                <ul className="ticks">
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Log every incident with operator, dispatcher and call sign
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Capture dispatch and arrival times to track response
                    performance
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Email a client their incident report as a PDF in one click
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Send every attempted or positive incident at once with Email
                    All
                  </li>
                </ul>
                <Link className="text-link" href="/register">
                  Start a free trial{" "}
                  <svg className="icon icon-sm" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </Link>
              </article>
              <article className="card aud-card">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-building" />
                  </svg>
                </span>
                <h3>Businesses &amp; in-house security</h3>
                <p className="aud-for">
                  Estates · Retail · Warehousing · Offices &amp; campuses
                </p>
                <p className="aud-pitch">
                  Keep a searchable history of everything that happens on your
                  property.
                </p>
                <ul className="ticks">
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    See every attempted and positive incident in one filterable
                    list
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Spot trends with monthly and yearly crime statistics
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Hand management, clients or regulators a PDF or CSV export
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Keep an immutable audit trail of every change and sign-in
                  </li>
                </ul>
                <Link className="text-link" href="/#contact">
                  Talk to our team{" "}
                  <svg className="icon icon-sm" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </Link>
              </article>
            </div>
          </div>
        </div>

        <div className="section band" id="features">
          <div className="wrap">
            <div className="section-head">
              <p className="kicker">Features</p>
              <h2>
                Everything you need to report, track and prove every incident
              </h2>
              <p>
                From the first call-out to the client hand-off, every step is
                captured in one place.
              </p>
            </div>
            <div className="bento">
              <article className="card feat feat-lg">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-file" />
                  </svg>
                </span>
                <h3>Incident reporting</h3>
                <p>
                  Log attempted and positive incidents with type, times,
                  location, client and a full description. Every report gets an
                  auto-generated reference number and is categorised
                  automatically.
                </p>
                <div className="mini-table-wrap">
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Type</th>
                        <th className="hide-sm">Suburb</th>
                        <th>Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="mono">SR-2026-0418</td>
                        <td>
                          <span className="chip chip-positive">Positive</span>
                        </td>
                        <td className="hide-sm">Zwartkop</td>
                        <td className="mono">7 min</td>
                      </tr>
                      <tr>
                        <td className="mono">SR-2026-0417</td>
                        <td>
                          <span className="chip chip-attempted">Attempted</span>
                        </td>
                        <td className="hide-sm">Lyttelton</td>
                        <td className="mono">11 min</td>
                      </tr>
                      <tr>
                        <td className="mono">SR-2026-0416</td>
                        <td>
                          <span className="chip chip-attempted">Attempted</span>
                        </td>
                        <td className="hide-sm">Irene</td>
                        <td className="mono">6 min</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
              <article className="card feat">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-clock" />
                  </svg>
                </span>
                <h3>Response times</h3>
                <p>
                  Record dispatch and arrival times on every call-out, then use
                  response-time charts to find problem areas.
                </p>
                <p className="big-number mono">
                  7<span> min</span>
                </p>
                <p className="big-caption">Dispatch → arrival · ALPHA-3</p>
              </article>
              <article className="card feat feat-md">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-chart" />
                  </svg>
                </span>
                <h3>Crime statistics</h3>
                <p>
                  Generate monthly or yearly analysis reports to spot incident
                  trends, and download the yearly statistics as a PDF.
                </p>
                <div className="bars" aria-hidden="true">
                  <span style={{ height: "38%" }} />
                  <span style={{ height: "52%" }} />
                  <span style={{ height: "44%" }} />
                  <span style={{ height: "61%" }} />
                  <span style={{ height: "48%" }} />
                  <span style={{ height: "70%" }} />
                  <span style={{ height: "58%" }} />
                  <span style={{ height: "64%" }} />
                  <span style={{ height: "49%" }} />
                  <span className="now" style={{ height: "76%" }} />
                </div>
                <div className="bar-labels" aria-hidden="true">
                  <span>J</span>
                  <span>F</span>
                  <span>M</span>
                  <span>A</span>
                  <span>M</span>
                  <span>J</span>
                  <span>J</span>
                  <span>A</span>
                  <span>S</span>
                  <span>O</span>
                </div>
              </article>
              <article className="card feat feat-md">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-send" />
                  </svg>
                </span>
                <h3>Client-ready exports</h3>
                <p>
                  Download any incident as a PDF, export to CSV, or email
                  reports straight to your client — one at a time or in bulk.
                </p>
                <div className="files">
                  <div className="file">
                    <svg className="icon" aria-hidden="true">
                      <use href="#i-file" />
                    </svg>
                    <span className="mono">SR-2026-0418.pdf</span>
                    <em>Emailed to client</em>
                  </div>
                  <div className="file">
                    <svg className="icon" aria-hidden="true">
                      <use href="#i-download" />
                    </svg>
                    <span className="mono">attempted-incidents.csv</span>
                    <em>Email All</em>
                  </div>
                </div>
              </article>
              <article className="card feat">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-audit" />
                  </svg>
                </span>
                <h3>Audit trail</h3>
                <p>
                  Immutable activity logs record every change and sign-in event
                  for compliance and review.
                </p>
              </article>
              <article className="card feat">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-key" />
                  </svg>
                </span>
                <h3>Roles &amp; permissions</h3>
                <p>
                  Separate Admin/Manager and Senior sign-in. Define what each
                  role can do and assign it to your users.
                </p>
              </article>
              <article className="card feat">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-dashboard" />
                  </svg>
                </span>
                <h3>Live dashboard</h3>
                <p>Track total, attempted and positive incidents at a glance.</p>
                <div className="stats" aria-hidden="true">
                  <div className="stat">
                    <b className="mono">128</b>
                    <span>Total</span>
                  </div>
                  <div className="stat">
                    <b className="mono">74</b>
                    <span>Attempted</span>
                  </div>
                  <div className="stat">
                    <b className="mono">54</b>
                    <span>Positive</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div className="section" id="how-it-works">
          <div className="wrap">
            <div className="section-head">
              <p className="kicker">How it works</p>
              <h2>From call-out to client report in three steps</h2>
            </div>
            <div className="steps">
              <article className="card step-card">
                <p className="step-num">STEP 01</p>
                <h3>Log the incident</h3>
                <p>
                  Capture what happened while it is fresh. A reference number is
                  assigned automatically when you submit.
                </p>
                <div className="tags">
                  <span>Type</span>
                  <span>Operator</span>
                  <span>Dispatcher</span>
                  <span>Times</span>
                  <span>Call sign</span>
                  <span>Address</span>
                  <span>Client</span>
                  <span>SAPS ref</span>
                </div>
              </article>
              <article className="card step-card">
                <p className="step-num">STEP 02</p>
                <h3>Track and search</h3>
                <p>
                  Filter reports by date range or type and open any incident for
                  the full detail. The dashboard shows trends and response
                  times.
                </p>
              </article>
              <article className="card step-card">
                <p className="step-num">STEP 03</p>
                <h3>Export and share</h3>
                <p>
                  Download a PDF or CSV, email a single report to your client,
                  or use Email All to send every attempted or positive incident
                  at once.
                </p>
              </article>
            </div>
            <p className="center">
              <Link className="text-link" href="/how-to">
                Read the full guide{" "}
                <svg className="icon icon-sm" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </Link>
            </p>
          </div>
        </div>

        <div className="section band" id="pricing">
          <div className="wrap">
            <div className="section-head">
              <p className="kicker">Pricing</p>
              <h2>Simple pricing, in Rand</h2>
              <p>
                Start free for 14 days with every feature. Upgrade when your
                team grows.
              </p>
            </div>
            <div className="pricing">
              <article className="card price-card">
                <div className="price-top">
                  <h3>Free trial</h3>
                </div>
                <p className="price-desc">
                  Full access to all features — with a 3-user limit during your
                  trial.
                </p>
                <p className="price">R 0</p>
                <p className="price-note">for 14 days</p>
                <ul className="ticks">
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Up to 3 users
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    All features included
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    No credit card required
                  </li>
                </ul>
                <Link className="btn btn-ghost btn-block" href="/register">
                  Start free trial
                </Link>
              </article>
              <article className="card price-card featured">
                <div className="price-top">
                  <h3>Professional</h3>
                  <span className="chip chip-accent">Growing teams</span>
                </div>
                <p className="price-desc">
                  For growing teams that need more seats.
                </p>
                <p className="price">
                  R 1,500<small> /month</small>
                </p>
                <p className="price-note">Up to 5 users</p>
                <ul className="ticks">
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Up to 5 user accounts
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    100 incident reports
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    CSV &amp; PDF export
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Priority support
                  </li>
                </ul>
                <Link className="btn btn-primary btn-block" href="/register">
                  Get started
                </Link>
              </article>
              <article className="card price-card">
                <div className="price-top">
                  <h3>Enterprise</h3>
                </div>
                <p className="price-desc">
                  For larger teams that need unlimited seats.
                </p>
                <p className="price">
                  R 4,500<small> /month</small>
                </p>
                <p className="price-note">Unlimited users</p>
                <ul className="ticks">
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Unlimited users
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    Unlimited reports
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    CSV &amp; PDF export
                  </li>
                  <li>
                    <span className="tick">
                      <svg className="icon" aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                    24/7 priority support
                  </li>
                </ul>
                <Link className="btn btn-ghost btn-block" href="/#contact">
                  Contact sales
                </Link>
              </article>
            </div>
            <p className="pricing-foot">
              Paid plans are billed monthly in advance. Upgrade from Billing
              when your trial ends.
            </p>
          </div>
        </div>

        <div className="section" id="security">
          <div className="wrap">
            <div className="section-head">
              <p className="kicker">Security</p>
              <h2>Your incident records, locked down</h2>
              <p>
                You protect your clients. SecReports protects the record of
                every incident.
              </p>
            </div>
            <div className="trust">
              <article className="card">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-lock" />
                  </svg>
                </span>
                <h3>Encrypted</h3>
                <p>
                  Data is encrypted at rest and in transit, with access controls
                  and regular security audits.
                </p>
              </article>
              <article className="card">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-audit" />
                  </svg>
                </span>
                <h3>Fully audited</h3>
                <p>
                  Every change and sign-in is logged with IP and browser,
                  visible only to your company&apos;s admins.
                </p>
              </article>
              <article className="card">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-users" />
                  </svg>
                </span>
                <h3>Role-based access</h3>
                <p>
                  Admins decide what each role can do and manage every account
                  in the company.
                </p>
              </article>
              <article className="card">
                <span className="icon-box">
                  <svg className="icon" aria-hidden="true">
                    <use href="#i-shield" />
                  </svg>
                </span>
                <h3>Your data stays yours</h3>
                <p>
                  You keep full ownership of everything you enter, and can
                  request deletion at any time.
                </p>
              </article>
            </div>
          </div>
        </div>

        <div className="section band" id="faq">
          <div className="wrap">
            <div className="section-head">
              <p className="kicker">FAQ</p>
              <h2>Questions, answered</h2>
            </div>
            <div className="faq">
              <details>
                <summary>How does the free trial work?</summary>
                <p>
                  You get 14 days of full access to every feature for up to 3
                  users, with no credit card required. When the trial ends, an
                  admin can upgrade from the Billing page.
                </p>
              </details>
              <details>
                <summary>Can we send reports to our clients?</summary>
                <p>
                  Yes. Download any incident as a PDF or email it straight to a
                  client. From the Attempted or Positive summary cards, Email
                  All sends every incident of that type as one PDF or CSV
                  attachment.
                </p>
              </details>
              <details>
                <summary>
                  We protect our own premises. Is SecReports for us?
                </summary>
                <p>
                  Yes. Any team that responds to incidents can log, track and
                  export reports the same way — whether you run a security
                  company or an in-house security team.
                </p>
              </details>
              <details>
                <summary>Who owns the incident data?</summary>
                <p>
                  You do. You retain all ownership of the data you enter, and
                  you can request deletion at any time by contacting support.
                </p>
              </details>
              <details>
                <summary>What user roles are there?</summary>
                <p>
                  Admins/Managers and Seniors sign in separately. Admins set
                  permissions for each role, manage users, review audit logs and
                  handle billing. The first account a company creates is its
                  admin.
                </p>
              </details>
            </div>
          </div>
        </div>

        <ContactSection />

        <div
          className="wrap"
          style={{ paddingBottom: "clamp(64px, 9vw, 104px)" }}
        >
          <div className="cta-band">
            <h2>Put every incident on record</h2>
            <p>Start your 14-day free trial today. No credit card required.</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/register">
                Start free trial{" "}
                <svg className="icon icon-sm" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </Link>
              <Link className="btn btn-ghost" href="/#contact">
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
