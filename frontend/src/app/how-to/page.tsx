import Link from "next/link";
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";

const steps = [
  {
    title: "1. Create your account",
    items: [
      "Click Start Free Trial or Get Started in the top navigation.",
      "Fill in your company name, your name, a valid email address, and a strong password (at least 8 characters with an uppercase letter, lowercase letter, number, and special character).",
      "Click the submit button. You will be taken to a success screen.",
      "Open the verification email we send you and click the link to verify your account.",
    ],
  },
  {
    title: "2. Log in",
    items: [
      "Click Sign In in the top navigation.",
      "Enter your verified email address and password.",
      "Click the Sign In button. You will land on your dashboard.",
      "If you forget your password, click Forgot password and follow the email reset link.",
    ],
  },
  {
    title: "3. Understand the dashboard",
    items: [
      "The dashboard gives you a snapshot of your security operations.",
      "Stat cards show total, attempted, and positive incidents, plus current-month activity.",
      "The Incident Trends chart shows monthly or yearly activity - use the toggle to switch.",
      "Incidents by Type and response-time charts help you spot problem areas fast.",
      "Use the Yearly / PDF button to download the crime statistics report.",
    ],
  },
  {
    title: "4. Report an incident",
    items: [
      "From the sidebar, click Report Incident.",
      "Select the incident Type - Attempted or Positive.",
      "Enter the operator name and dispatcher for the response, plus dispatch and arrival times if available.",
      "Enter the call sign, property address, suburb, city, and client details.",
      "Add any SAPS reference number if one was opened.",
      "Write a clear, detailed description of what happened in the Report box.",
      "Click Submit Report. The incident is saved with an auto-generated reference number.",
    ],
  },
  {
    title: "5. Manage incidents",
    items: [
      "Open Incidents from the sidebar to see every report in a table.",
      "Filter by date range or incident type, or click Clear to reset.",
      "Click a reference number or title to open the full incident details.",
      "Use the action buttons to download a PDF of a single incident or email it to a client.",
      "From the Attempted or Positive summary cards, click Email All to send every incident of that type as one PDF or CSV attachment.",
    ],
  },
  {
    title: "6. Admin tools and billing",
    items: [
      "Admins see an Admin Tools section in the sidebar: Permissions, Users, Audit Logs, and Billing.",
      "Permissions control what each role can do - assign them to users as needed.",
      "Users lists every account in your company so you can manage access.",
      "Audit Logs records every change and login event for compliance and review.",
      "Billing lets you view your plan and upgrade when your trial ends.",
    ],
  },
];

export default function HowToPage() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.04),transparent_50%)] pointer-events-none" />
      <Header />

      <section className="mx-auto max-w-5xl px-6 py-24 sm:py-32 lg:px-8">
        <h1 className="text-3xl font-bold text-text sm:text-4xl">
          How to use SecReports
        </h1>
        <p className="mt-3 text-text-secondary">
          A step-by-step guide to getting the most out of the platform, from
          your first login to reporting incidents and managing your
          account.
        </p>

        <div className="mt-12 space-y-6">
          {steps.map((step) => (
            <article
              key={step.title}
              className="rounded-2xl bg-surface p-6 ring-1 ring-border-light hover:ring-primary/20 transition-all duration-200"
            >
              <h2 className="text-lg font-semibold text-text">{step.title}</h2>
              <ol className="mt-4 space-y-3 list-decimal list-inside">
                {step.items.map((item) => (
                  <li key={item} className="text-sm text-text-secondary leading-relaxed">
                    {item}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-surface p-6 ring-1 ring-border-light text-center">
          <h2 className="text-lg font-semibold text-text">Still need help?</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Contact us at support@secreports.co.za and we will help you get set
            up.
          </p>
          <Link
            href="/register"
            className="cursor-pointer mt-5 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all duration-150"
          >
            Get Started
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}