import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage, { aggregateYearly } from "./page";
import { reportService } from "@/services";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, role: "admin", name: "Admin", email: "admin@test.com", status: "active", companyId: 1 } }),
}));

jest.mock("@/services", () => ({
  reportService: { summary: jest.fn(), monthlyStats: jest.fn() },
}));

const mockSummary = reportService.summary as jest.Mock;
const mockMonthly = reportService.monthlyStats as jest.Mock;

const mockData = {
  total: 25,
  byStatus: [],
  recent: [
    { id: 1, referenceNumber: "SEC-001", title: "Server down", status: "under_review", incidentDate: "2026-05-01T00:00:00Z", createdAt: "2026-05-01T00:00:00Z" },
    { id: 2, referenceNumber: "SEC-002", title: "Phishing email", status: "submitted", incidentDate: "2026-05-15T00:00:00Z", createdAt: "2026-05-15T00:00:00Z" },
  ],
  attemptedCount: 3,
  positiveCount: 2,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMonthly.mockResolvedValue({ data: [] });
});

describe("DashboardPage", () => {
  it("shows loading spinner initially", () => {
    mockSummary.mockReturnValue(new Promise(() => {}));
    mockMonthly.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders stat cards with correct labels", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Attempted incidents")).toBeInTheDocument();
    });

    expect(screen.getByText("Positive incidents")).toBeInTheDocument();
  });

  it("renders stat card values", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    expect(screen.getByText("2")).toBeInTheDocument();
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
      expect(screen.getByText("Attempted incidents")).toBeInTheDocument();
    });
  });

  it("shows empty states when no data", async () => {
    const emptyData = {
      total: 0,
      byStatus: [],
      recent: [],
      attemptedCount: 0,
      positiveCount: 0,
    };
    mockSummary.mockResolvedValue({ data: emptyData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText("No incidents reported yet.").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows monthly/yearly toggle and switches mode", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthly.mockResolvedValue({
      data: [
        { month: "2025-12", count: 1 },
        { month: "2026-01", count: 2 },
      ],
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Incident Trends")).toBeInTheDocument();
    });

    const monthlyBtn = screen.getByText("monthly").closest("button")!;
    const yearlyBtn = screen.getByText("yearly").closest("button")!;
    expect(monthlyBtn.className).toContain("text-primary");

    await userEvent.click(yearlyBtn);
    expect(yearlyBtn.className).toContain("text-primary");
  });
});

describe("aggregateYearly", () => {
  it("aggregates counts per calendar month across all years and zero-fills every month", () => {
    const result = aggregateYearly([
      { month: "2024-01", count: 5 },
      { month: "2025-01", count: 3 },
      { month: "2025-03", count: 2 },
      { month: "2026-06", count: 7 },
    ]);

    expect(result).toHaveLength(12);
    expect(result[0]).toEqual({ month: "Jan", count: 8 });
    expect(result[2]).toEqual({ month: "Mar", count: 2 });
    expect(result[5]).toEqual({ month: "Jun", count: 7 });
    expect(result[11]).toEqual({ month: "Dec", count: 0 });
  });

  it("returns all twelve months with zero counts for empty data", () => {
    const result = aggregateYearly([]);
    expect(result).toHaveLength(12);
    expect(result.every((d) => d.count === 0)).toBe(true);
  });
});
