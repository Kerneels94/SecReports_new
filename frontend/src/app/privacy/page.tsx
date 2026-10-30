import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";
import { SiteIcons } from "@/components/site/SiteIcons";

const sections = [
  {
    id: "privacy-collect",
    num: "01",
    title: "Information We Collect",
    body: (
      <>
        <p>
          We collect information you provide directly to us, including your
          name, email address, company details, and billing information when you
          register for an account or use our services.
        </p>
        <p>
          When you use our services, we automatically record technical
          information for security and audit purposes, including your IP address
          and the browser type and version you are using. This data is captured
          in our activity (audit) logs and is only visible to administrators of
          your own company. This processing is based on our legitimate interest
          in protecting our services and accounts from misuse, aligned with the
          Protection of Personal Information Act (POPIA).
        </p>
        <p>
          We may also use service cookies and analytics (such as PostHog) to
          understand how visitors use our website. You can control or decline
          non-essential cookies using the cookie banner shown on our site.
        </p>
      </>
    ),
  },
  {
    id: "privacy-use",
    num: "02",
    title: "How We Use Your Information",
    body: (
      <p>
        We use the information we collect to provide, maintain, and improve our
        services, process transactions, send technical notices and support
        messages, and communicate with you about our services.
      </p>
    ),
  },
  {
    id: "privacy-security",
    num: "03",
    title: "Data Security",
    body: (
      <p>
        We implement industry-standard security measures including encryption at
        rest and in transit, access controls, and regular security audits to
        protect your data.
      </p>
    ),
  },
  {
    id: "password-policy",
    num: "04",
    title: "Password Policy",
    body: (
      <>
        <p>
          To protect your account and your organisation&apos;s data, all
          passwords must be strong. A strong password contains:
        </p>
        <ul>
          <li>At least 8 characters</li>
          <li>At least one lowercase letter</li>
          <li>At least one uppercase letter</li>
          <li>At least one digit</li>
          <li>At least one special character</li>
        </ul>
      </>
    ),
  },
  {
    id: "privacy-retention",
    num: "05",
    title: "Data Retention",
    body: (
      <p>
        We retain your data for as long as your account is active or as needed
        to provide you services. You may request deletion of your data at any
        time by contacting our support team.
      </p>
    ),
  },
  {
    id: "privacy-third-party",
    num: "06",
    title: "Third-Party Services",
    body: (
      <p>
        We may share data with third-party service providers who perform
        services on our behalf, such as payment processing and email delivery.
        These providers are contractually obligated to protect your data.
      </p>
    ),
  },
  {
    id: "privacy-rights",
    num: "07",
    title: "Your Rights",
    body: (
      <p>
        You have the right to access, correct, or delete your personal data. You
        may also object to or restrict certain processing of your data. To
        exercise these rights, contact us at{" "}
        <a href="mailto:support@secreports.co.za">
          support@secreports.co.za
        </a>
        .
      </p>
    ),
  },
  {
    id: "privacy-contact",
    num: "08",
    title: "Contact",
    body: (
      <p>
        If you have questions about this Privacy Policy, please contact us at{" "}
        <a href="mailto:support@secreports.co.za">
          support@secreports.co.za
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="site-redesign">
      <SiteIcons />
      <Header />
      <main>
        <div className="page-hero grid-glow">
          <div className="wrap">
            <p className="kicker">Legal</p>
            <h1>Privacy Policy</h1>
            <p className="meta">Last updated: 14 September 2026</p>
          </div>
        </div>
        <div className="wrap docs">
          <nav className="toc" aria-label="Privacy policy sections">
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
                {section.body}
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
