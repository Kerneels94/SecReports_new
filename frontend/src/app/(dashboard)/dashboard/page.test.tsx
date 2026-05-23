import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";
import { reportService } from "@/services";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/services", () => ({
  reportService: { summary: jest.fn() },
}));

const mockSummary = reportService.summary as jest.Mock;

const mockData = {
  total: 25,
  byStatus: [
    { status: "open", _count: { id: 5 } },
    { status: "submitted", _count: { id: 3 } },
    { status: "resolved", _count: { id: 10 } },
    { status: "closed", _count: { id: 7 } },
  ],
  bySeverity: [
    { severity: "low", _count: { id: 10 } },
    { severity: "medium", _count: { id: 8 } },
    { severity: "high", _count: { id: 5 } },
    { severity: "critical", _count: { id: 2 } },
  ],
  recent: [
    { id: 1, referenceNumber: "SEC-001", title: "Server down", severity: "high", status: "under_review" },
    { id: 2, referenceNumber: "SEC-002", title: "Phishing email", severity: "medium", status: "submitted" },
  ],
  assignedToMe: 3,
  overdueActions: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("DashboardPage", () => {
  it("shows loading spinner initially", () => {
    mockSummary.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders 4 stat cards with correct labels", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Open Incidents")).toBeInTheDocument();
    });

    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("Assigned to Me")).toBeInTheDocument();
    expect(screen.getByText("Overdue Actions")).toBeInTheDocument();
  });

  it("renders stat card values", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Open Incidents")).toBeInTheDocument();
    });

    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders recent incidents table", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
      expect(screen.getByText("Server down")).toBeInTheDocument();
      expect(screen.getByText("SEC-002")).toBeInTheDocument();
      expect(screen.getByText("Phishing email")).toBeInTheDocument();
    });
  });

  it("renders severity breakdown bars", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Incidents by Severity")).toBeInTheDocument();
    });

    const lowLabels = screen.getAllByText("low");
    expect(lowLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows error state with retry", async () => {
    mockSummary.mockRejectedValue(new Error("Network error"));
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load dashboard data")).toBeInTheDocument();
    });

    const retryBtn = screen.getByText("Retry");
    expect(retryBtn).toBeInTheDocument();

    mockSummary.mockResolvedValue({ data: mockData });
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Server down")).toBeInTheDocument();
    });
  });

  it("shows empty states when no data", async () => {
    const emptyData = {
      total: 0,
      byStatus: [],
      bySeverity: [],
      recent: [],
      assignedToMe: 0,
      overdueActions: 0,
    };
    mockSummary.mockResolvedValue({ data: emptyData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No incidents reported yet.")).toBeInTheDocument();
      expect(screen.getByText("No data available.")).toBeInTheDocument();
    });
  });
});
