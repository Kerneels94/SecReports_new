import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminAuditLogsPage from "./page";
import { adminAuditService, adminCompanyService } from "@/services";

jest.mock("@/services", () => ({
  adminAuditService: { listAll: jest.fn(), exportCompany: jest.fn() },
  adminCompanyService: { list: jest.fn() },
}));

jest.mock("@/components/ui/Badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockListAll = adminAuditService.listAll as jest.Mock;
const mockExport = adminAuditService.exportCompany as jest.Mock;
const mockCompanies = adminCompanyService.list as jest.Mock;

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: "entry-1",
  entityType: "user",
  entityId: "u1",
  action: "login",
  oldValues: null,
  newValues: null,
  performedBy: "u1",
  createdAt: "2026-09-14T12:00:00Z",
  performedByUser: {
    id: "u1",
    name: "Test User",
    email: "test@example.com",
    company: { id: "c1", name: "Acme" },
  },
  ipAddress: "1.2.3.4",
  userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/126.0",
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockListAll.mockResolvedValue({
    data: { data: [], total: 0, page: 1, perPage: 20 },
  });
  mockCompanies.mockResolvedValue({
    data: [
      {
        id: "c1",
        name: "Acme",
        subscription: { status: "active", plan: { id: "p1", name: "Pro", price: 50000 } },
      },
    ],
  });
  mockExport.mockResolvedValue({
    data: { emailedTo: ["admin@acme.com"], count: 3 },
  });
});

describe("AdminAuditLogsPage", () => {
  it("loads every company's logs by default", async () => {
    render(<AdminAuditLogsPage />);
    await waitFor(() =>
      expect(mockListAll).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: undefined, page: 1 }),
      ),
    );
  });

  it("filters by the selected company", async () => {
    render(<AdminAuditLogsPage />);
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getAllByRole("option", { name: "Acme" }).length).toBeGreaterThan(0),
    );
    await user.selectOptions(screen.getAllByRole("combobox")[0], "c1");

    await waitFor(() => {
      expect(mockListAll).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "c1", page: 1 }),
      );
    });
  });

  it("shows the company column for each entry", async () => {
    mockListAll.mockResolvedValue({
      data: { data: [makeEntry()], total: 1, page: 1, perPage: 20 },
    });
    render(<AdminAuditLogsPage />);

    await waitFor(() => expect(screen.getAllByText("Acme").length).toBeGreaterThan(0));
  });

  it("expands a row to show request details", async () => {
    mockListAll.mockResolvedValue({
      data: { data: [makeEntry()], total: 1, page: 1, perPage: 20 },
    });
    render(<AdminAuditLogsPage />);

    await waitFor(() => expect(screen.getByText("Test User")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Test User"));

    expect(screen.getByText("1.2.3.4")).toBeInTheDocument();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
  });

  it("emails the company export to the superadmin and client", async () => {
    render(<AdminAuditLogsPage />);
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getAllByRole("option", { name: "Acme" }).length).toBeGreaterThan(0),
    );

    const exportSelect = screen.getAllByRole("combobox")[2];
    await user.selectOptions(exportSelect, "c1");
    await user.click(screen.getByRole("button", { name: /email export/i }));

    await waitFor(() => expect(mockExport).toHaveBeenCalledWith("c1"));
    expect(
      await screen.findByText(/Emailed 3 entries to admin@acme.com/),
    ).toBeInTheDocument();
  });
});
