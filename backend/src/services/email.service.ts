/**
 * Email sending service using SMTP (nodemailer) via the host's own mail server.
 * Handles transactional emails for registration, invoices, cancellations,
 * suspensions, and reports using dynamic template imports.
 *
 * FROM_EMAIL     - app-facing sender (support@secreports.co.za)
 * ADMIN_FROM_EMAIL - superadmin/accounts sender (accounts@secreports.co.za)
 */
import nodemailer from "nodemailer";

const FROM_EMAIL = process.env.FROM_EMAIL || "support@secreports.co.za";
export const ADMIN_FROM_EMAIL =
  process.env.ADMIN_FROM_EMAIL || "accounts@secreports.co.za";
const OWNER_NOTIFY_EMAIL = process.env.OWNER_NOTIFY_EMAIL;

const port = parseInt(process.env.SMTP_PORT || "587", 10);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  // If port is 465, secure must be true. If port is 587, secure must be false (STARTTLS).
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  // Crucial for serverless functions to prevent premature socket drops
  connectionTimeout: 10000,
  socketTimeout: 10000,
});

async function sendEmail({
  from,
  to,
  subject,
  html,
  attachments,
  replyTo,
}: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: string | Buffer }[];
  replyTo?: string;
}) {
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments,
      replyTo,
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
  subject:
    | "register"
    | "invoice"
    | "cancellation"
    | "suspention"
    | "report"
    | "trial_ending"
    | "contact";
  data?: Record<string, unknown>;
  from?: string;
  /** Set for enquiries so a direct reply reaches the original sender. */
  replyTo?: string;
  attachments?: Attachment[];
}

const subjectLabels: Record<string, string> = {
  register: "Welcome to SecReports",
  invoice: "Invoice from SecReports",
  cancellation: "Subscription Cancelled",
  suspention: "Account Suspended",
  report: "New Incident Report",
  trial_ending: "Your SecReports Free Trial Is Ending Soon",
  contact: "New SecReports Website Enquiry",
};

/** Builds HTML from lazy-loaded templates by subject type and sends via SMTP. */
export async function sendMail({
  to,
  subject,
  data = {},
  from,
  replyTo,
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
          dueDate: data.dueDate as string | undefined,
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
          companyName: (data.companyName as string) || "SecReports",
          incidentAddress: (data.incidentAddress as string) || "N/A",
          incidentType: (data.incidentType as string) || "N/A",
          reportLink: data.reportLink as string | undefined,
        });
        break;
      }
      case "trial_ending": {
        const { default: template } = await import("../templates/trial-ending");
        html = template({
          name: (data.name as string) || "there",
          daysRemaining: (data.daysRemaining as number) || 2,
        });
        break;
      }
      case "contact": {
        const { default: template } = await import("../templates/contact");
        html = template({
          name: (data.name as string) || "there",
          email: (data.email as string) || "",
          company: data.company as string | undefined,
          message: (data.message as string) || "",
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
      replyTo,
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

/** Sends an email verification link to a newly registered user. */
export async function sendVerificationEmail(
  to: string,
  name: string,
  verifyLink: string,
) {
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

/** Notifies the application owner when a new company self-registers. */
export async function sendNewCompanyAlert(
  companyName: string,
  adminName: string,
  adminEmail: string,
) {
  const { default: template } = await import("../templates/new-company");
  const html = template(companyName, adminName, adminEmail);

  if (!OWNER_NOTIFY_EMAIL) {
    console.error("OWNER_NOTIFY_EMAIL not set, skipping new company alert");
    return {};
  }

  const { data, error } = await sendEmail({
    from: ADMIN_FROM_EMAIL,
    to: [OWNER_NOTIFY_EMAIL],
    subject: `New Company Registered: ${companyName}`,
    html,
  });

  if (error) {
    console.error({ error });
    return { error };
  }

  return { data };
}

export default async function handler() {
  try {
    const to = process.env.SMTP_USER;
    if (!to) throw new Error("SMTP_USER not set");
    const result = await sendMail({
      to,
      subject: "register",
      data: { name: "Test User" },
    });

    if (result.error) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : err;
    return new Response(
      JSON.stringify({ success: false, error }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
