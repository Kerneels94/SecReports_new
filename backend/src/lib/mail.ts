import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const from = process.env.SMTP_FROM || "SecReports <noreply@secreports.com>";

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailParams) {
  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log(`[Mail] Sent: ${info.messageId}${info.accepted.length ? ` to ${info.accepted.join(", ")}` : ""}`);
    if (process.env.SMTP_HOST?.includes("ethereal")) {
      console.log(`[Mail] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return info;
  } catch (err) {
    console.error("[Mail] Failed to send:", err);
  }
}

export async function sendWelcomeEmail(to: string, name: string) {
  const { default: template } = await import("../templates/welcome");
  return sendMail({
    to,
    subject: "Welcome to SecReports",
    html: template(name),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, resetLink: string) {
  const { default: template } = await import("../templates/reset-password");
  return sendMail({
    to,
    subject: "Reset Your SecReports Password",
    html: template(name, resetLink),
  });
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  const { default: template } = await import("../templates/password-changed");
  return sendMail({
    to,
    subject: "Your SecReports Password Has Been Changed",
    html: template(name),
  });
}
