/**
 * Email sending service using Resend or SMTP (nodemailer) as a fallback.
 * Handles transactional emails for registration, invoices, cancellations,
 * suspensions, and reports using dynamic template imports.
 */
import { Resend } from "resend";
import nodemailer from "nodemailer";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const useResend = RESEND_API_KEY && RESEND_API_KEY !== "<your-resend-api-key>";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

let resend: Resend | null = null;
let transporter: nodemailer.Transporter | null = null;

if (useResend) {
  resend = new Resend(RESEND_API_KEY);
} else {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  });
}

async function sendEmail({
  from,
  to,
  subject,
  html,
  attachments,
}: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: string | Buffer }[];
}) {
  if (resend) {
    return resend.emails.send({ from, to, subject, html, attachments });
  }

  try {
    const info = await transporter!.sendMail({
      from,
      to,
      subject,
      html,
      attachments,
    });
    return { data: info };
  } catch (error) {
    console.error(error);
    return { error };
  }
}

interface Attachment {
  filename: string;
  content: string | Buffer;
}

/** Parameters for sending a transactional email. */
interface SendMailParams {
  to: string;
  subject: "register" | "invoice" | "cancellation" | "suspention" | "report";
  data?: Record<string, unknown>;
  from?: string;
  attachments?: Attachment[];
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
  attachments,
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

    const { data: res, error } = await sendEmail({
      from: from || FROM_EMAIL,
      to: [to],
      subject: subjectLabels[subject] || subject,
      html,
      attachments,
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

  const { data, error } = await sendEmail({
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

  const { data, error } = await sendEmail({
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

  const { data, error } = await sendEmail({
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
