import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuditLogsPage from "./page";
import { adminAuditService } from "@/services";

jest.mock("@/services", () => ({
  adminAuditService: { list: jest.fn(), exportPdf: jest.fn() },
}));

jest.mock("@/components/ui/Badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockList = adminAuditService.list as jest.Mock;
const mockExportPdf = adminAuditService.exportPdf as jest.Mock;

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: "entry-1",
  entityType: "user",
  entityId: "u1",
  action: "login",
  oldValues: null,
  newValues: null,
  performedBy: "u1",
  createdAt: "2026-09-14T12:00:00Z",
  performedByUser: { id: "u1", name: "Test User", email: "test@example.com", company: { id: "c1", name: "Co" } },
  ipAddress: "1.2.3.4",
  userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/126.0",
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue({
    data: { data: [], total: 0, page: 1, perPage: 20 },
  });
});

describe("AuditLogsPage", () => {
  it("renders table headers and filter options", async () => {
    render(<AuditLogsPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(screen.getByText("All Actions")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("passes selected action to the service", async () => {
    render(<AuditLogsPage />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole("combobox"), "login");

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ action: "login", page: 1 }),
      );
    });
  });

  it("offers only actions the backend logs, including user deletions", async () => {
    render(<AuditLogsPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    const user = userEvent.setup();

    expect(screen.queryByRole("option", { name: "Deleted" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox"), "user_deleted");

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ action: "user_deleted", page: 1 }),
      );
    });
  });

  it("debounces search input into a single request", async () => {
    jest.useFakeTimers();
    render(<AuditLogsPage />);
    mockList.mockClear();

    const input = screen.getByPlaceholderText("Search by user, email, or action...");
    fireEvent.change(input, { target: { value: "l" } });
    fireEvent.change(input, { target: { value: "lo" } });
    fireEvent.change(input, { target: { value: "log" } });

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(1);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: "log", page: 1 }),
      );
    });
    jest.useRealTimers();
  });

  it("expands a row on click and shows IP address and browser", async () => {
    mockList.mockResolvedValue({
      data: { data: [makeEntry()], total: 1, page: 1, perPage: 20 },
    });
    render(<AuditLogsPage />);

    await waitFor(() => expect(screen.getByText("Test User")).toBeInTheDocument());

    expect(screen.queryByText("1.2.3.4")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Test User"));

    expect(screen.getByText("1.2.3.4")).toBeInTheDocument();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
  });

  it("downloads the company audit log PDF", async () => {
    URL.createObjectURL = jest.fn(() => "blob:mock-url");
    URL.revokeObjectURL = jest.fn();
    mockExportPdf.mockResolvedValue(new Blob(["%PDF"]));

    render(<AuditLogsPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /export pdf/i }));

    await waitFor(() => expect(mockExportPdf).toHaveBeenCalled());
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
