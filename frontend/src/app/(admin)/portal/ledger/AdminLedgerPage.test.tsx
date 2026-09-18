import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminLedgerPage from "./page";
import { adminLedgerService, adminCompanyService } from "@/services";
import type { LedgerEntry, LedgerSummary, AdminCompany } from "@/types";

jest.mock("@/services", () => ({
  adminLedgerService: {
    list: jest.fn(),
    summary: jest.fn(),
    voidEntry: jest.fn(),
    create: jest.fn(),
  },
  adminCompanyService: {
    list: jest.fn(),
  },
}));

jest.mock("@/components/ui/Modal", () => ({
  Modal: ({ open, onClose, title, children }: {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button aria-label="Close" onClick={onClose}>×</button>
        {children}
      </div>
    ) : null,
}));

jest.mock("@/components/ui/Badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockList = adminLedgerService.list as jest.Mock;
const mockSummary = adminLedgerService.summary as jest.Mock;
const mockCreate = adminLedgerService.create as jest.Mock;
const mockCompanies = adminCompanyService.list as jest.Mock;

const company: AdminCompany = {
  id: "c1",
  name: "Acme Security",
  email: "acme@example.com",
  createdAt: "2026-01-01T00:00:00.000Z",
  subscription: null,
};

const entry: LedgerEntry = {
  id: "e1",
  companyId: "c1",
  entryType: "payment",
  amount: 150000,
  currency: "ZAR",
  description: "Payment received for INV-2026-0001",
  reference: "PAY-INV-2026-0001",
  status: "posted",
  postedAt: "2026-01-15T10:00:00.000Z",
  createdAt: "2026-01-15T10:00:00.000Z",
  updatedAt: "2026-01-15T10:00:00.000Z",
  company: { id: "c1", name: "Acme Security", email: "acme@example.com" },
};

const summary: LedgerSummary = {
  totalIn: 200000,
  totalOut: 20000,
  netBalance: 180000,
  entryCount: 3,
  byType: [{ entryType: "payment", total: 200000, count: 2 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue({ data: [entry] });
  mockSummary.mockResolvedValue({ data: summary });
  mockCompanies.mockResolvedValue({ data: [company] });
});

describe("AdminLedgerPage", () => {
  it("renders summary cards and ledger entries", async () => {
    render(<AdminLedgerPage />);

    expect(await screen.findByText("Net Balance")).toBeInTheDocument();
    expect(screen.getByText(/R 1\s?800/)).toBeInTheDocument();
    expect(screen.getByText(/R 2\s?000/)).toBeInTheDocument();
    expect(await screen.findAllByText("Acme Security")).toHaveLength(2);
    expect(screen.getByText("PAY-INV-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("payment")).toBeInTheDocument();
  });

  it("shows an empty state when there are no entries", async () => {
    mockList.mockResolvedValue({ data: [] });

    render(<AdminLedgerPage />);

    expect(
      await screen.findByText("No ledger entries found."),
    ).toBeInTheDocument();
  });

  it("shows an error when loading fails", async () => {
    mockList.mockRejectedValue(new Error("Failed to load ledger"));

    render(<AdminLedgerPage />);

    expect(await screen.findByText("Failed to load ledger")).toBeInTheDocument();
  });

  it("creates a ledger entry through the modal", async () => {
    mockCreate.mockResolvedValue({ success: true, data: entry });
    render(<AdminLedgerPage />);
    const user = userEvent.setup();

    await screen.findAllByText("Acme Security");
    await user.click(screen.getByRole("button", { name: /new entry/i }));

    await user.selectOptions(screen.getByLabelText("Company"), "c1");
    await user.selectOptions(screen.getByLabelText("Type"), "payment");
    await user.type(screen.getByLabelText(/amount/i), "2500");
    await user.click(screen.getByRole("button", { name: /post entry/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        companyId: "c1",
        entryType: "payment",
        amount: 250000,
        reference: undefined,
        description: undefined,
      });
    });
    expect(await screen.findByText("Ledger entry posted")).toBeInTheDocument();
  });

  it("shows validation errors for missing required fields", async () => {
    render(<AdminLedgerPage />);
    const user = userEvent.setup();

    await screen.findAllByText("Acme Security");
    await user.click(screen.getByRole("button", { name: /new entry/i }));
    await user.click(screen.getByRole("button", { name: /post entry/i }));

    await waitFor(() => {
      expect(screen.getByText("Company is required")).toBeInTheDocument();
      expect(screen.getByText("Type is required")).toBeInTheDocument();
      expect(screen.getByText("Amount is required")).toBeInTheDocument();
    });
  });

  it("shows an entry status", async () => {
    mockList.mockResolvedValue({ data: [{ ...entry, status: "paid" }] });

    render(<AdminLedgerPage />);

    expect(await screen.findByText("paid")).toBeInTheDocument();
  });
});
