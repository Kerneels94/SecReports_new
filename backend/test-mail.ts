import "dotenv/config";

async function main() {
  const to = process.env.OWNER_NOTIFY_EMAIL;
  if (!to) throw new Error("OWNER_NOTIFY_EMAIL not set");

  const { sendVerificationEmail, sendPasswordResetEmail, sendMail, sendNewCompanyAlert, ADMIN_FROM_EMAIL } =
    await import("./src/services/email.service");

  console.log("resend key :", process.env.RESEND_API_KEY ? "set" : "MISSING");
  console.log("admin from:", ADMIN_FROM_EMAIL);
  console.log("sending to:", to, "\n");

  const run = async (label: string, fn: () => Promise<unknown>) => {
    const r = (await fn().catch((e) => ({ error: e }))) as { error?: unknown } | undefined;
    console.log(
      r?.error
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

  // Exercises the real contact route: validator -> contact template -> Resend.
  await run("contact form -> support inbox", async () => {
    const { submitContact } = await import("./src/routes/contact.routes");
    const req = {
      body: {
        name: "Mail Test",
        email: "test@example.com",
        company: "Test Co",
        message: "Contact form delivery test.",
      },
      log: { error: (...a: unknown[]) => console.error(...a) },
    } as never;
    let payload: { success?: boolean } = {};
    const reply = {
      code: () => reply,
      send: (r: { success?: boolean }) => {
        payload = r;
      },
    } as never;
    await submitContact(req, reply);
    return payload.success ? {} : { error: new Error(JSON.stringify(payload)) };
  });
}

main().then(() => process.exit(0));