/**
 * Shared layout and styling helpers for every SecReports email template.
 * Mirrors the yearly crime statistics PDF (export.controller.ts): zinc-800
 * background, zinc-900 surfaces, green footer strip, blue accent.
 *
 * @module layout
 */
import { escapeHtml } from "./escape";

export const BRAND = {
  // Dark theme: zinc-800 page/body background, light grey text throughout.
  background: "#27272a", // zinc-800
  surface: "#18181b", // zinc-900
  border: "#3f3f46", // zinc-700
  muted: "#d4d4d8", // zinc-300
  faint: "#a1a1aa", // zinc-400
  heading: "#f4f4f5", // zinc-100
  body: "#d4d4d8", // zinc-300
  label: "#a1a1aa", // zinc-400
  accent: "#3b82f6", // blue accent, same as the yearly crime PDF counter cards
  success: "#4ade80", // app-green footer strip
} as const;

interface EmailLayoutOptions {
  title?: string;
  body: string;
  /** Overrides the footer note for emails that are not automated (e.g. contact form). */
  footerNote?: string;
}

/** Full HTML document shell with the shared brand header and footer. */
export function emailLayout({
  title = "SecReports",
  body,
  footerNote = "This is an automated notification. Please do not reply directly.",
}: EmailLayoutOptions): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: ${BRAND.surface}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.02);">

    <tr>
      <td style="background: ${BRAND.background}; padding: 32px 24px; text-align: center; border-bottom: 4px solid ${BRAND.border};">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">SecReports</h1>
        <p style="margin: 8px 0 0 0; color: ${BRAND.muted}; font-size: 14px; font-weight: 400; letter-spacing: 0.3px; text-transform: uppercase;">Incident Management Platform</p>
      </td>
    </tr>

    <tr>
      <td style="padding: 40px 32px;">
        ${body}
      </td>
    </tr>

    <tr>
      <td style="background: ${BRAND.background}; padding: 20px 24px; text-align: center; border-top: 4px solid ${BRAND.success};">
        <p style="margin: 0; font-size: 13px; color: ${BRAND.muted};">
          &copy; ${new Date().getFullYear()} SecReports. All rights reserved.
          <br />
          <span style="color: ${BRAND.faint};">${escapeHtml(footerNote)}</span>
        </p>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/** Salutation at the top of the email body. */
export function greeting(name: string): string {
  const safeName = escapeHtml(name);
  return `<p style="margin: 0 0 8px 0; font-size: 16px; color: ${BRAND.heading}; font-weight: 500;">Dear <strong style="color: #ffffff;">${safeName}</strong>,</p>`;
}

/** Standard body paragraph. */
export function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND.body}; line-height: 1.6;">${text}</p>`;
}

/** Alert-style paragraph (used for security warnings). */
export function alertParagraph(text: string): string {
  return `<p style="margin: 0 0 16px 0; font-size: 16px; color: #f87171; font-weight: 600; line-height: 1.6;">${text}</p>`;
}

/** Small muted footnote. */
export function mutedNote(text: string): string {
  return `<p style="margin: 4px 0 0 0; font-size: 13px; color: ${BRAND.muted}; line-height: 1.6;">${text}</p>`;
}

/** Closing sign-off line. */
export function signOff(): string {
  return `<p style="margin: 0; font-size: 15px; color: ${BRAND.label};">&mdash; The SecReports Team</p>`;
}

/** Centered call-to-action button. */
export function ctaButton(href: string, label: string): string {
  return `
  <div style="text-align: center; margin: 32px 0;">
    <a href="${href}"
       style="background: ${BRAND.accent}; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
      ${label}
    </a>
  </div>`;
}

interface DetailRow {
  label: string;
  value: string;
  icon?: string;
}

/** Highlighted summary card (label/value pairs) used for report details. */
export function detailCard(rows: DetailRow[]): string {
  const cells = rows
    .map(
      (row) => `
      <tr>
        <td style="padding: 6px 0; font-size: 15px; color: ${BRAND.label};">
          <span style="font-weight: 600; color: ${BRAND.heading};">${row.icon ? `${row.icon} ` : ""}${row.label}:</span> ${row.value}
        </td>
      </tr>`,
    )
    .join("");
  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${BRAND.background}; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; border: 1px solid ${BRAND.border};">
    ${cells}
  </table>`;
}