import Link from "next/link";
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";
import { SiteIcons } from "@/components/site/SiteIcons";

const steps = [
  {
    id: "guide-account",
    num: "1",
    title: "Create your account",
    items: [
      "Click Start Free Trial or Get Started in the top navigation.",
      "Fill in your company name, your name, a valid email address, and a strong password (at least 8 characters with an uppercase letter, lowercase letter, number, and special character).",
      "Click the submit button. You will be taken to a success screen.",
      "Open the verification email we send you and click the link to verify your account.",
    ],
  },
  {
    id: "guide-login",
    num: "2",
    title: "Log in",
    items: [
      "Click Sign In in the top navigation.",
      "Enter your verified email address and password.",
      "Click the Sign In button. You will land on your dashboard.",
      "If you forget your password, click Forgot password and follow the email reset link.",
    ],
  },
  {
    id: "guide-dashboard",
    num: "3",
    title: "Understand the dashboard",
    intro: "The dashboard gives you a snapshot of your security operations.",
    items: [
      "Stat cards show total, attempted, and positive incidents, plus current-month activity.",
      "The Incident Trends chart shows monthly or yearly activity — use the toggle to switch.",
      "Incidents by Type and response-time charts help you spot problem areas fast.",
      "Use the Yearly / PDF button to download the crime statistics report.",
    ],
  },
  {
    id: "guide-report",
    num: "4",
    title: "Report an incident",
    items: [
      "From the sidebar, click Report Incident.",
      "Select the incident Type — Attempted or Positive.",
      "Enter the operator name and dispatcher for the response, plus dispatch and arrival times if available.",
      "Enter the call sign, property address, suburb, city, and client details.",
      "Add any SAPS reference number if one was opened.",
      "Write a clear, detailed description of what happened in the Report box.",
      "Click Submit Report. The incident is saved with an auto-generated reference number.",
    ],
  },
  {
    id: "guide-manage",
    num: "5",
    title: "Manage incidents",
    items: [
      "Open Incidents from the sidebar to see every report in a table.",
      "Filter by date range or incident type, or click Clear to reset.",
      "Click a reference number or title to open the full incident details.",
      "Use the action buttons to download a PDF of a single incident or email it to a client.",
      "From the Attempted or Positive summary cards, click Email All to send every incident of that type as one PDF or CSV attachment.",
    ],
  },
  {
    id: "guide-admin",
    num: "6",
    title: "Admin tools and billing",
    items: [
      "Admins see an Admin Tools section in the sidebar: Permissions, Users, Audit Logs, and Billing.",
      "Permissions control what each role can do — assign them to users as needed.",
      "Users lists every account in your company so you can manage access.",
      "Audit Logs records every change and login event for compliance and review.",
      "Billing lets you view your plan and upgrade when your trial ends.",
    ],
  },
];

export default function HowToPage() {
  return (
    <div className="site-redesign">
      <SiteIcons />
      <Header />
      <main>
        <div className="page-hero grid-glow">
          <div className="wrap">
            <p className="kicker">Guide</p>
            <h1>How to use SecReports</h1>
            <p>
              A step-by-step guide to getting the most out of the platform, from
              your first login to reporting incidents and managing your account.
            </p>
          </div>
        </div>
        <div className="wrap docs">
          <nav className="toc" aria-label="Guide steps">
            <p className="toc-title">On this page</p>
            {steps.map((step) => (
              <a key={step.id} href={`#${step.id}`}>
                {step.num}. {step.title}
              </a>
            ))}
          </nav>
          <div className="guide">
            {steps.map((step) => (
              <article className="card guide-step" id={step.id} key={step.id}>
                <header>
                  <span className="num">{step.num}</span>
                  <h2>{step.title}</h2>
                </header>
                {step.intro && <p>{step.intro}</p>}
                <ol>
                  {step.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </article>
            ))}
            <div className="card help-card">
              <div>
                <h2>Still need help?</h2>
                <p>
                  Contact us at{" "}
                  <a
                    className="mail"
                    href="mailto:support@secreports.co.za"
                  >
                    support@secreports.co.za
                  </a>{" "}
                  and we will help you get set up.
                </p>
              </div>
              <Link className="btn btn-primary" href="/register">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
