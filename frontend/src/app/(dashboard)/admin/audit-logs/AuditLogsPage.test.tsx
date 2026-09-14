import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuditLogsPage from "./page";
import { adminAuditService } from "@/services";

jest.mock("@/services", () => ({
  adminAuditService: { list: jest.fn() },
}));

jest.mock("@/components/ui/Badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockList = adminAuditService.list as jest.Mock;

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
});
