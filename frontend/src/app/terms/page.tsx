import Link from "next/link";
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.04),transparent_50%)] pointer-events-none" />
      <Header />

      <section className="mx-auto max-w-3xl px-6 py-24 sm:py-32 lg:px-8">
        <h1 className="text-3xl font-bold text-text sm:text-4xl">
          Terms & Conditions
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Last updated: 29 July 2026
        </p>

        <div className="mt-10 space-y-6 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-lg font-semibold text-text">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using SecReports, you agree to be bound by these
            Terms & Conditions. If you do not agree, you may not use the
            service.
          </p>

          <h2 className="text-lg font-semibold text-text">
            2. Description of Service
          </h2>
          <p>
            SecReports provides a web-based incident reporting and security
            management platform for private security companies. We reserve the
            right to modify or discontinue the service at any time.
          </p>

          <h2 className="text-lg font-semibold text-text">3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account. You must notify us immediately of any unauthorized use.
          </p>

          <h2 className="text-lg font-semibold text-text">4. Acceptable Use</h2>
          <p>
            You agree not to misuse the service for any unlawful purpose or in
            violation of any applicable laws or regulations. You may not attempt
            to gain unauthorized access to any part of the service.
          </p>

          <h2 className="text-lg font-semibold text-text">
            5. Payment & Billing
          </h2>
          <p>
            Paid plans are billed monthly in advance. All fees are
            non-refundable unless otherwise stated. We reserve the right to
            change pricing with 30 days notice.
          </p>

          <h2 className="text-lg font-semibold text-text">6. Data Ownership</h2>
          <p>
            You retain all ownership of the data you input into the platform. We
            do not claim any intellectual property rights over your data.
          </p>

          <h2 className="text-lg font-semibold text-text">
            7. Limitation of Liability
          </h2>
          <p>
            SecReports shall not be liable for any indirect, incidental,
            special, or consequential damages arising from your use of the
            service.
          </p>

          <h2 className="text-lg font-semibold text-text">8. Termination</h2>
          <p>
            We may terminate or suspend your account at any time for violation
            of these terms. Upon termination, your right to use the service
            ceases immediately.
          </p>

          <h2 className="text-lg font-semibold text-text">9. Contact</h2>
          <p>
            For questions about these terms, contact us at
            support@secreports.co.za.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
