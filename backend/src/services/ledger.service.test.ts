import { LedgerService } from "./ledger.service";
import { prisma } from "../lib/db";
import { ValidationError, NotFoundError, ConflictError } from "../lib/errors";

jest.mock("../lib/db", () => ({
  prisma: {
    company: {
      findUnique: jest.fn(),
    },
    ledger: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

const company = { id: "company1" };
const entry = {
  id: "entry1",
  companyId: "company1",
  entryType: "payment",
  amount: 150000,
  currency: "ZAR",
  description: "Payment received for INV-2026-0001",
  reference: "PAY-INV-2026-0001",
  status: "posted",
  postedAt: new Date("2026-01-15T10:00:00.000Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
  company: { id: "company1", name: "Acme", email: "acme@example.com" },
};

const validData = {
  companyId: "company1",
  entryType: "payment",
  amount: 150000,
  reference: "PAY-INV-2026-0001",
};

describe("LedgerService.postEntry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.company.findUnique as jest.Mock).mockResolvedValue(company);
    (prisma.ledger.create as jest.Mock).mockResolvedValue(entry);
  });

  it("creates a ledger entry for valid data", async () => {
    const result = await LedgerService.postEntry(validData);

    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: "company1" },
      select: { id: true },
    });
    expect(prisma.ledger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company1",
          entryType: "payment",
          amount: 150000,
          status: "posted",
        }),
      }),
    );
    expect(result).toEqual(entry);
  });

  it("defaults currency and postedAt when not provided", async () => {
    await LedgerService.postEntry({ ...validData, amount: -50000 });

    const createArgs = (prisma.ledger.create as jest.Mock).mock.calls[0][0];
    expect(createArgs.data.currency).toBe("ZAR");
    expect(createArgs.data.postedAt).toBeInstanceOf(Date);
  });

  it("throws ValidationError for an unknown entry type", async () => {
    await expect(
      LedgerService.postEntry({ ...validData, entryType: "cash" }),
    ).rejects.toThrow(ValidationError);
    expect(prisma.ledger.create).not.toHaveBeenCalled();
  });

  it("throws ValidationError for a zero or non-finite amount", async () => {
    await expect(
      LedgerService.postEntry({ ...validData, amount: 0 }),
    ).rejects.toThrow(ValidationError);
    await expect(
      LedgerService.postEntry({ ...validData, amount: NaN }),
    ).rejects.toThrow(ValidationError);
    expect(prisma.ledger.create).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the company does not exist", async () => {
    (prisma.company.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(LedgerService.postEntry(validData)).rejects.toThrow(
      NotFoundError,
    );
    expect(prisma.ledger.create).not.toHaveBeenCalled();
  });
});

describe("LedgerService.getEntries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.ledger.findMany as jest.Mock).mockResolvedValue([entry]);
  });

  it("returns entries for the given filters", async () => {
    const result = await LedgerService.getEntries({
      companyId: "company1",
      entryType: "payment",
    });

    expect(prisma.ledger.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "company1", entryType: "payment" },
        orderBy: { postedAt: "desc" },
      }),
    );
    expect(result).toEqual([entry]);
  });

  it("builds a postedAt range when date filters are supplied", async () => {
    await LedgerService.getEntries({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    const where = (prisma.ledger.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.postedAt).toEqual({
      gte: new Date("2026-01-01"),
      lte: new Date("2026-01-31"),
    });
  });

  it("returns all entries when no filters are supplied", async () => {
    await LedgerService.getEntries();
    expect(prisma.ledger.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});

describe("LedgerService.getEntryById", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the entry when found", async () => {
    (prisma.ledger.findUnique as jest.Mock).mockResolvedValue(entry);

    const result = await LedgerService.getEntryById("entry1");
    expect(prisma.ledger.findUnique).toHaveBeenCalledWith({
      where: { id: "entry1" },
      include: expect.anything(),
    });
    expect(result).toEqual(entry);
  });

  it("throws NotFoundError when the entry does not exist", async () => {
    (prisma.ledger.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(LedgerService.getEntryById("missing")).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("LedgerService.voidEntry", () => {
  beforeEach(() => jest.clearAllMocks());

  it("marks a posted entry as void", async () => {
    (prisma.ledger.findUnique as jest.Mock).mockResolvedValue(entry);
    (prisma.ledger.update as jest.Mock).mockResolvedValue({
      ...entry,
      status: "void",
    });

    const result = await LedgerService.voidEntry("entry1");

    expect(prisma.ledger.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "entry1" },
        data: { status: "void" },
      }),
    );
    expect(result.status).toBe("void");
  });

  it("throws NotFoundError when the entry does not exist", async () => {
    (prisma.ledger.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(LedgerService.voidEntry("missing")).rejects.toThrow(
      NotFoundError,
    );
    expect(prisma.ledger.update).not.toHaveBeenCalled();
  });

  it("throws ConflictError when the entry is already void", async () => {
    (prisma.ledger.findUnique as jest.Mock).mockResolvedValue({
      ...entry,
      status: "void",
    });

    await expect(LedgerService.voidEntry("entry1")).rejects.toThrow(
      ConflictError,
    );
    expect(prisma.ledger.update).not.toHaveBeenCalled();
  });
});

describe("LedgerService.getSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.ledger.findMany as jest.Mock).mockResolvedValue([
      { amount: 150000, entryType: "payment" },
      { amount: 50000, entryType: "invoice" },
      { amount: -20000, entryType: "refund" },
    ]);
    (prisma.ledger.groupBy as jest.Mock).mockResolvedValue([
      { entryType: "payment", _sum: { amount: 150000 }, _count: 1 },
      { entryType: "invoice", _sum: { amount: 50000 }, _count: 1 },
      { entryType: "refund", _sum: { amount: -20000 }, _count: 1 },
    ]);
  });

  it("only considers posted entries", async () => {
    await LedgerService.getSummary();

    expect(prisma.ledger.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "posted" } }),
    );
    expect(prisma.ledger.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "posted" } }),
    );
  });

  it("computes totals, balance and counts", async () => {
    const result = await LedgerService.getSummary();

    expect(result).toMatchObject({
      totalIn: 200000,
      totalOut: 20000,
      netBalance: 180000,
      entryCount: 3,
    });
    expect(result.byType).toHaveLength(3);
  });
});
