import { Header } from "../../components/header/Header";
import { Footer } from "@/components/footer/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.04),transparent_50%)] pointer-events-none" />
      <Header />

      <section className="mx-auto max-w-3xl px-6 py-24 sm:py-32 lg:px-8">
        <h1 className="text-3xl font-bold text-text sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Last updated: 14 September 2026
        </p>

        <div className="mt-10 space-y-6 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-lg font-semibold text-text">
            1. Information We Collect
          </h2>
          <p>
            We collect information you provide directly to us, including your
            name, email address, company details, and billing information when
            you register for an account or use our services.
          </p>
          <p>
            When you use our services, we automatically record technical
            information for security and audit purposes, including your IP
            address and the browser type and version you are using. This data
            is captured in our activity (audit) logs and is only visible to
            administrators of your own company. This processing is based on our
            legitimate interest in protecting our services and accounts from
            misuse, aligned with the Protection of Personal Information Act
            (POPIA).
          </p>
          <p>
            We may also use service cookies and analytics (such as PostHog) to
            understand how visitors use our website. You can control or decline
            non-essential cookies using the cookie banner shown on our site.
          </p>

          <h2 className="text-lg font-semibold text-text">
            2. How We Use Your Information
          </h2>
          <p>
            We use the information we collect to provide, maintain, and improve
            our services, process transactions, send technical notices and
            support messages, and communicate with you about our services.
          </p>

          <h2 className="text-lg font-semibold text-text">3. Data Security</h2>
          <p>
            We implement industry-standard security measures including
            encryption at rest and in transit, access controls, and regular
            security audits to protect your data.
          </p>

          <h2 id="password-policy" className="text-lg font-semibold text-text">
            4. Password Policy
          </h2>
          <p>
            To protect your account and your organisation&apos;s data, all passwords
            must be strong. A strong password contains:
          </p>
          <ul className="list-disc pl-5">
            <li>At least 8 characters</li>
            <li>At least one lowercase letter</li>
            <li>At least one uppercase letter</li>
            <li>At least one digit</li>
            <li>At least one special character</li>
          </ul>

          <h2 className="text-lg font-semibold text-text">5. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as
            needed to provide you services. You may request deletion of your
            data at any time by contacting our support team.
          </p>

          <h2 className="text-lg font-semibold text-text">
            6. Third-Party Services
          </h2>
          <p>
            We may share data with third-party service providers who perform
            services on our behalf, such as payment processing and email
            delivery. These providers are contractually obligated to protect
            your data.
          </p>

          <h2 className="text-lg font-semibold text-text">7. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data.
            You may also object to or restrict certain processing of your data.
            To exercise these rights, contact us at support@secreports.co.za.
          </p>

          <h2 className="text-lg font-semibold text-text">8. Contact</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us
            at support@secreports.co.za.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
