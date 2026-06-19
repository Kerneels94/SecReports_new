/**
 * Email sending service using Resend. Handles transactional emails for registration,
 * invoices, cancellations, suspensions, and reports using dynamic template imports.
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

/** Parameters for sending a transactional email. */
interface SendMailParams {
  to: string;
  subject: "register" | "invoice" | "cancellation" | "suspention" | "report";
  data?: Record<string, unknown>;
  from?: string;
}

const subjectLabels: Record<string, string> = {
  register: "Welcome to SecReports",
  invoice: "Invoice from SecReports",
  cancellation: "Subscription Cancelled",
  suspention: "Account Suspended",
  report: "New Incident Report",
};

/** Builds HTML from lazy-loaded templates by subject type and sends via Resend. */
export async function sendMail({
  to,
  subject,
  data = {},
  from,
}: SendMailParams) {
  try {
    let html = "";

    switch (subject) {
      case "register": {
        const { default: template } = await import("../templates/welcome");
        html = template((data.name as string) || "there");
        break;
      }
      case "invoice": {
        const { default: template } = await import("../templates/invoice");
        html = template({
          companyName: (data.companyName as string) || "Valued Customer",
          amount: (data.amount as number) || 0,
          invoiceNumber: (data.invoiceNumber as string) || "N/A",
          invoiceLink: data.invoiceLink as string | undefined,
        });
        break;
      }
      case "cancellation": {
        const { default: template } = await import("../templates/cancellation");
        html = template({
          companyName: (data.companyName as string) || "Valued Customer",
        });
        break;
      }
      case "suspention": {
        const { default: template } = await import("../templates/suspension");
        html = template({
          companyName: (data.companyName as string) || "Valued Customer",
          reason: data.reason as string | undefined,
        });
        break;
      }
      case "report": {
        const { default: template } = await import("../templates/report");
        html = template({
          name: (data.name as string) || "there",
          incidentTitle: (data.incidentTitle as string) || "Incident Report",
          referenceNumber: (data.referenceNumber as string) || "N/A",
          reportLink: data.reportLink as string | undefined,
        });
        break;
      }
      default:
        html = "<p>No content available.</p>";
    }

    const { data: res, error } = await resend.emails.send({
      from: from || FROM_EMAIL,
      to: [to],
      subject: subjectLabels[subject] || subject,
      html,
    });

    if (error) {
      console.error({ error });
      return { error };
    }

    return { data: res };
  } catch (error) {
    console.error(error);
    return { error };
  }
}

/** Convenience wrapper to send a welcome email using the "register" template. */
export async function sendWelcomeEmail(to: string, name: string) {
  return sendMail({ to, subject: "register", data: { name } });
}

/** Sends an email verification link to a newly registered user. */
export async function sendVerificationEmail(to: string, name: string, verifyLink: string) {
  const { default: template } = await import("../templates/verify-email");
  const html = template(name, verifyLink);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: "Verify Your SecReports Account",
    html,
  });

  if (error) {
    console.error({ error });
    return { error };
  }

  return { data };
}

/** Sends a password reset email containing the reset link using a dedicated template. */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string,
) {
  const { default: template } = await import("../templates/reset-password");
  const html = template(name, resetLink);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: "Reset Your SecReports Password",
    html,
  });

  if (error) {
    console.error({ error });
    return { error };
  }

  return { data };
}

/** Sends a password change confirmation email. */
export async function sendPasswordChangedEmail(to: string, name: string) {
  const { default: template } = await import("../templates/password-changed");
  const html = template(name);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: "Your SecReports Password Has Been Changed",
    html,
  });

  if (error) {
    console.error({ error });
    return { error };
  }

  return { data };
}
