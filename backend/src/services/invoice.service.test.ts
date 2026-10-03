import { InvoiceService } from "./invoice.service";
import { prisma } from "../lib/db";
import { sendMail } from "./email.service";

jest.mock("../lib/db", () => ({
  prisma: {
    invoice: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentHistory: { create: jest.fn() },
    ledger: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("./email.service", () => ({
  sendMail: jest.fn(),
  ADMIN_FROM_EMAIL: "accounts@secreports.co.za",
}));

const company = { id: "company1", name: "Acme", email: "acme@example.com" };

const invoice = {
  id: "inv1",
  companyId: "company1",
  invoiceNumber: "INV-2026-0001",
  amount: 150000,
  currency: "ZAR",
  status: "draft",
  dueDate: new Date("2026-02-07T00:00:00.000Z"),
  paidAt: null,
  company,
};

describe("InvoiceService.createInvoice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.invoice.create as jest.Mock).mockResolvedValue(invoice);
  });

  it("creates a draft invoice without posting to the ledger", async () => {
    const result = await InvoiceService.createInvoice({
      companyId: "company1",
      amount: 150000,
      dueDate: new Date("2026-02-07T00:00:00.000Z"),
    });

    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "draft" }),
      }),
    );
    expect(prisma.ledger.create).not.toHaveBeenCalled();
    expect(result).toBe(invoice);
  });
});

describe("InvoiceService.sendInvoice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(invoice);
    (prisma.invoice.update as jest.Mock).mockResolvedValue({
      ...invoice,
      status: "sent",
    });
  });

  it("marks the invoice sent only after the email succeeds", async () => {
    (sendMail as jest.Mock).mockResolvedValue({ data: { id: "msg1" } });

    await InvoiceService.sendInvoice("inv1");

    expect(sendMail).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "accounts@secreports.co.za" }),
    );
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "sent" } }),
    );
    expect(
      (sendMail as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan((prisma.invoice.update as jest.Mock).mock.invocationCallOrder[0]);
  });

  it("leaves the invoice as draft when the email fails", async () => {
    (sendMail as jest.Mock).mockResolvedValue({ error: new Error("smtp down") });

    await expect(InvoiceService.sendInvoice("inv1")).rejects.toThrow(
      "Invoice email could not be sent",
    );
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });
});

describe("InvoiceService.markAsPaid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      ...invoice,
      status: "sent",
    });
    (prisma.invoice.update as jest.Mock).mockResolvedValue({
      ...invoice,
      status: "paid",
    });
    (prisma.paymentHistory.create as jest.Mock).mockResolvedValue({});
    (prisma.ledger.create as jest.Mock).mockResolvedValue({});
    (prisma.$transaction as jest.Mock).mockImplementation(
      (ops: Promise<unknown>[]) => Promise.all(ops),
    );
  });

  it("records the payment in the ledger only when marked paid", async () => {
    await InvoiceService.markAsPaid("inv1");

    expect(prisma.paymentHistory.create).toHaveBeenCalled();
    expect(prisma.ledger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryType: "payment",
          status: "paid",
          reference: "PAY-INV-2026-0001",
        }),
      }),
    );
  });
});
