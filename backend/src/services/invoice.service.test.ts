import { InvoiceService } from "./invoice.service";
import { prisma } from "../lib/db";
import { sendMail } from "./email.service";
import { ConflictError } from "../lib/errors";

jest.mock("../lib/db", () => ({
  prisma: {
    invoice: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    company: { findMany: jest.fn() },
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
  createdAt: new Date("2026-02-01T00:00:00.000Z"),
  description: "Standard Package payment",
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
    (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  });

  it("claims the draft as sent, emails it once, and returns it as sent", async () => {
    // Both values are consumed here, so none leak into later tests.
    (prisma.invoice.findUnique as jest.Mock)
      .mockResolvedValueOnce(invoice)
      .mockResolvedValueOnce({ ...invoice, status: "sent" });
    (sendMail as jest.Mock).mockResolvedValue({ data: { id: "msg1" } });

    const result = await InvoiceService.sendInvoice("inv1");

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "accounts@secreports.co.za" }),
    );
    expect(prisma.invoice.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
      where: { id: "inv1", status: "draft" },
      data: { status: "sent" },
    });
    expect(result?.status).toBe("sent");
  });

  it("does not email the client again when a concurrent request already claimed the draft", async () => {
    (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    await expect(InvoiceService.sendInvoice("inv1")).rejects.toThrow(ConflictError);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("attaches the invoice as a PDF", async () => {
    (sendMail as jest.Mock).mockResolvedValue({ data: { id: "msg1" } });

    await InvoiceService.sendInvoice("inv1");

    const attachments = (sendMail as jest.Mock).mock.calls[0][0].attachments;
    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toBe("INV-2026-0001.pdf");
    expect(Buffer.isBuffer(attachments[0].content)).toBe(true);
    expect(attachments[0].content.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("leaves the invoice as draft when the email fails", async () => {
    (sendMail as jest.Mock).mockResolvedValue({ error: new Error("smtp down") });

    await expect(InvoiceService.sendInvoice("inv1")).rejects.toThrow(
      "Invoice email could not be sent",
    );
    expect(prisma.invoice.updateMany).toHaveBeenLastCalledWith({
      where: { id: "inv1", status: "sent" },
      data: { status: "draft" },
    });
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
    (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.invoice.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      ...invoice,
      status: "paid",
    });
    (prisma.paymentHistory.create as jest.Mock).mockResolvedValue({});
    (prisma.ledger.create as jest.Mock).mockResolvedValue({});
    (prisma.$transaction as jest.Mock).mockImplementation(
      (arg: ((tx: typeof prisma) => Promise<unknown>) | Promise<unknown>[]) =>
        typeof arg === "function" ? arg(prisma) : Promise.all(arg),
    );
  });

  it("does not record a second payment when a concurrent request already marked it paid", async () => {
    (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    await expect(InvoiceService.markAsPaid("inv1")).rejects.toThrow("Invoice already paid");
    expect(prisma.paymentHistory.create).not.toHaveBeenCalled();
    expect(prisma.ledger.create).not.toHaveBeenCalled();
  });

  it("reports a transaction write conflict as already paid", async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Transaction failed due to a write conflict"), { code: "P2034" }),
    );

    await expect(InvoiceService.markAsPaid("inv1")).rejects.toThrow("Invoice already paid");
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

describe("InvoiceService.generateMonthlyInvoices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 17)); // 17 Oct 2026
    (prisma.company.findMany as jest.Mock).mockResolvedValue([
      {
        id: "company1",
        name: "Acme",
        subscription: { plan: { name: "Standard", price: 150000 } },
      },
    ]);
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.invoice.create as jest.Mock).mockResolvedValue(invoice);
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(invoice);
    (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (sendMail as jest.Mock).mockResolvedValue({ data: { id: "msg1" } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sets the due date to the 25th billing day, not the 7th", async () => {
    await InvoiceService.generateMonthlyInvoices();

    const data = (prisma.invoice.create as jest.Mock).mock.calls[0][0].data;
    expect(data.dueDate.getDate()).toBe(25);
    expect(data.dueDate.getMonth()).toBe(9); // October
  });
});
