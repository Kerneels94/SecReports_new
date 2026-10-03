import "dotenv/config";

async function main() {
  const to = process.env.OWNER_NOTIFY_EMAIL;
  if (!to) throw new Error("OWNER_NOTIFY_EMAIL not set");

  const { sendVerificationEmail, sendPasswordResetEmail, sendMail, sendNewCompanyAlert, ADMIN_FROM_EMAIL } =
    await import("./src/services/email.service");

  console.log("smtp host :", process.env.SMTP_HOST, process.env.SMTP_PORT);
  console.log("admin from:", ADMIN_FROM_EMAIL);
  console.log("sending to:", to, "\n");

  const run = async (label: string, fn: () => Promise<{ error?: unknown }>) => {
    const r = await fn().catch((e) => ({ error: e }));
    console.log(
      r.error
        ? `FAIL  ${label}: ${(r.error as Error).message ?? r.error}`
        : `OK    ${label}`,
    );
  };

  await run("support@ -> verification", () =>
    sendVerificationEmail(to, "Mail Test", "https://example.com/verify-test"),
  );
  await run("support@ -> password reset", () =>
    sendPasswordResetEmail(to, "Mail Test", "https://example.com/reset-test"),
  );
  await run("accounts@ -> invoice", () =>
    sendMail({
      to,
      from: ADMIN_FROM_EMAIL,
      subject: "invoice",
      data: {
        companyName: "Mail Test",
        amount: 1,
        invoiceNumber: "INV-TEST-0001",
        dueDate: new Date().toISOString(),
      },
    }),
  );
  await run("accounts@ -> new company", () =>
    sendNewCompanyAlert("Mail Test Co", "Test Admin", "test@example.com"),
  );
}

main().then(() => process.exit(0));