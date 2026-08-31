/**
 * Email template sent to a company when their subscription is cancelled.
 *
 * @module cancellation
 */
import { emailLayout, greeting, paragraph, mutedNote, ctaButton } from "./layout";

interface CancellationData {
  companyName: string;
}

export default function cancellationTemplate(data: CancellationData): string {
  const body = `
        ${greeting(data.companyName)}
        ${paragraph("Your SecReports subscription has been <strong>cancelled</strong>.")}
        ${paragraph("You will continue to have access to your account until the end of the current billing period. After that, your account will be downgraded to the free plan with limited features.")}
        ${mutedNote("If you believe this was a mistake or would like to reactivate your subscription, please contact our support team.")}
        ${ctaButton("mailto:support@secreports.co.za", "Contact Support")}
      `;

  return emailLayout({ title: "Subscription Cancelled", body });
}