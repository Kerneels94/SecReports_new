/**
 * Email template sent to a company when their free trial is ending.
 *
 * @module trial-ending
 */
import { emailLayout, greeting, paragraph, ctaButton, mutedNote } from "./layout";

interface TrialEndingData {
  name: string;
  daysRemaining: number;
}

export default function trialEndingTemplate(data: TrialEndingData): string {
  const { daysRemaining } = data;
  const body = `
        ${greeting(data.name)}
        ${paragraph("Your <strong>14-day free trial</strong> is ending soon.")}
        ${paragraph(`You have <strong>${daysRemaining} day${daysRemaining === 1 ? "" : "s"}</strong> remaining. After your trial ends, access to certain features will be limited.`)}
        ${paragraph("Upgrade to <strong>Professional</strong> or <strong>Enterprise</strong> to keep full access.")}
        ${ctaButton("https://secreports.app/settings/billing", "Upgrade Now")}
        ${mutedNote("If you have any questions, contact our support team.")}
      `;

  return emailLayout({ title: "Your Free Trial Is Ending Soon", body });
}