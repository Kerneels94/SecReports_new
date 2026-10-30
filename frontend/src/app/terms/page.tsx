import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";
import { SiteIcons } from "@/components/site/SiteIcons";

const sections = [
  {
    id: "terms-acceptance",
    num: "01",
    title: "Acceptance of Terms",
    body: "By accessing or using SecReports, you agree to be bound by these Terms & Conditions. If you do not agree, you may not use the service.",
  },
  {
    id: "terms-service",
    num: "02",
    title: "Description of Service",
    body: "SecReports provides a web-based incident reporting and security management platform for private security companies. We reserve the right to modify or discontinue the service at any time.",
  },
  {
    id: "terms-accounts",
    num: "03",
    title: "User Accounts",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.",
  },
  {
    id: "terms-use",
    num: "04",
    title: "Acceptable Use",
    body: "You agree not to misuse the service for any unlawful purpose or in violation of any applicable laws or regulations. You may not attempt to gain unauthorized access to any part of the service.",
  },
  {
    id: "terms-billing",
    num: "05",
    title: "Payment & Billing",
    body: "Paid plans are billed monthly in advance. All fees are non-refundable unless otherwise stated. We reserve the right to change pricing with 30 days notice.",
  },
  {
    id: "terms-data",
    num: "06",
    title: "Data Ownership",
    body: "You retain all ownership of the data you input into the platform. We do not claim any intellectual property rights over your data.",
  },
  {
    id: "terms-liability",
    num: "07",
    title: "Limitation of Liability",
    body: "SecReports shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.",
  },
  {
    id: "terms-termination",
    num: "08",
    title: "Termination",
    body: "We may terminate or suspend your account at any time for violation of these terms. Upon termination, your right to use the service ceases immediately.",
  },
  {
    id: "terms-contact",
    num: "09",
    title: "Contact",
    body: "For questions about these terms, contact us at support@secreports.co.za.",
  },
];

export default function TermsPage() {
  return (
    <div className="site-redesign">
      <SiteIcons />
      <Header />
      <main>
        <div className="page-hero grid-glow">
          <div className="wrap">
            <p className="kicker">Legal</p>
            <h1>Terms &amp; Conditions</h1>
            <p className="meta">Last updated: 29 July 2026</p>
          </div>
        </div>
        <div className="wrap docs">
          <nav className="toc" aria-label="Terms sections">
            <p className="toc-title">On this page</p>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>
          <div className="legal">
            {sections.map((section) => (
              <section id={section.id} key={section.id}>
                <h2>
                  <span>{section.num}</span>
                  {section.title}
                </h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
