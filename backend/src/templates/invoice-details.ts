/**
 * Business details printed on every invoice — email body and PDF attachment both
 * read these so they can never drift apart.
 *
 * Fill in the real address here. Banking details come from env
 * (BANK_NAME, ACCOUNT_HOLDER, ACCOUNT_NUMBER, BRANCH_CODE).
 *
 * NOTE: no company registration number is shown — add one under `REGISTRATION`
 * only once the business is actually registered with CIPC. Likewise the trading
 * name must not claim "(Pty) Ltd" before registration.
 *
 * @module invoice-details
 */

export const BUSINESS_NAME = "SecReports";
export const BUSINESS_EMAIL = "support@secreports.co.za";

/** Company registration number. Empty until registered with CIPC. */
export const BUSINESS_REGISTRATION = "";

/** Postal address lines shown under the sender. Empty array hides the address. */
export const BUSINESS_ADDRESS: string[] = [
  // TODO: add the real postal address, one line per entry, e.g.
  // "12 Example Road",
  // "Randburg, Johannesburg, 2194",
  "48B Rhyolite",
  "Swartkop, Centurion",
];

export const BANK_DETAILS = {
  bankName: process.env.BANK_NAME ?? "",
  accountHolder: process.env.ACCOUNT_HOLDER || BUSINESS_NAME,
  accountNumber: process.env.ACCOUNT_NUMBER ?? "",
  branchCode: process.env.BRANCH_CODE ?? "",
};

/** Default line item when an invoice has no description of its own. */
export const DEFAULT_ITEM_DESCRIPTION = "Standard Package - monthly service";
