import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage, { aggregateYearly, fillMonthGaps } from "./page";
import { reportService, exportService } from "@/services";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/hooks/useAuth", () => {
  const authState: { permissions: string[] } = {
    permissions: ["reports.view", "export.reports"],
  };
  return {
    __authState: authState,
    useAuth: () => ({
      user: {
        id: 1,
        role: "admin",
        name: "Admin",
        email: "admin@test.com",
        status: "active",
        companyId: 1,
        permissions: authState.permissions,
      },
    }),
  };
});

const { __authState: authState } = jest.requireMock("@/hooks/useAuth");

jest.mock("@/services", () => ({
  ...jest.requireActual("@/services"),
  reportService: { summary: jest.fn(), monthlyStats: jest.fn(), monthlyResponse: jest.fn(), responseByArea: jest.fn() },
  exportService: { downloadYearlyPdf: jest.fn(), downloadResponseTimePdf: jest.fn() },
}));

const mockSummary = reportService.summary as jest.Mock;
const mockMonthly = reportService.monthlyStats as jest.Mock;
const mockMonthlyResponse = reportService.monthlyResponse as jest.Mock;
const mockResponseByArea = reportService.responseByArea as jest.Mock;
const mockDownloadPdf = exportService.downloadYearlyPdf as jest.Mock;
const mockDownloadResponseTime = exportService.downloadResponseTimePdf as jest.Mock;

const mockData = {
  total: 25,
  byStatus: [],
  recent: [
    { id: 1, referenceNumber: "SEC-001", title: "Server down", status: "under_review", incidentDate: "2026-05-01T00:00:00Z", createdAt: "2026-05-01T00:00:00Z", reporter: { id: 1, name: "John Doe" } },
    { id: 2, referenceNumber: "SEC-002", title: "Phishing email", status: "submitted", incidentDate: "2026-05-15T00:00:00Z", createdAt: "2026-05-15T00:00:00Z", reporter: { id: 2, name: "Jane Smith" } },
  ],
  attemptedCount: 3,
  positiveCount: 2,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMonthly.mockResolvedValue({ data: [] });
  mockMonthlyResponse.mockResolvedValue({ data: [] });
  mockResponseByArea.mockResolvedValue({ data: [] });
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
    expect(screen.getByText("Total incidents")).toBeInTheDocument();
  });

  it("renders stat labels at 18px and lets the trend card header wrap", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    const label = await screen.findByText("Total incidents");
    expect(label.className).toContain("text-lg");

    const trendHeader = screen.getByText("Incident Trends").parentElement;
    expect(trendHeader?.className).toContain("flex-wrap");
  });

  it("renders stat card values", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  

  it("renders month-over-month delta card", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthly.mockResolvedValue({
      data: [
        { month: "2026-03", count: 10 },
        { month: "2026-04", count: 7 },
      ],
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Apr 2026 incidents")).toBeInTheDocument();
    });

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText(/▼ 3 vs previous month/)).toBeInTheDocument();
  });

  it("renders avg response time chart", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthlyResponse.mockResolvedValue({
      data: [
        { month: "2026-01", avgMs: 1800000 },
        { month: "2026-02", avgMs: 1320000 },
      ],
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Avg Response Time")).toBeInTheDocument();
    });
  });

  it("renders response time by area breakdown", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockResponseByArea.mockResolvedValue({
      data: [
        { area: "North CBD", avgMs: 1800000, count: 2 },
        { area: "South Gate", avgMs: 600000, count: 1 },
      ],
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Response Time by Area")).toBeInTheDocument();
    });

    expect(screen.getByText("North CBD")).toBeInTheDocument();
    expect(screen.getByText("30m 0s")).toBeInTheDocument();
    expect(screen.getByText("2 incidents")).toBeInTheDocument();
  });

  it("shows a sub-minute area average as seconds rather than zero", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockResponseByArea.mockResolvedValue({
      data: [{ area: "North CBD", avgMs: 24000, count: 1 }],
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("0m 24s")).toBeInTheDocument();
    });
  });

  it("keeps dashboard rendering when response metrics fail", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthlyResponse.mockRejectedValue(new Error("down"));
    mockResponseByArea.mockRejectedValue(new Error("down"));
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Failed to load response time data").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText("Attempted incidents")).toBeInTheDocument();
    expect(screen.getByText("Incident Trends")).toBeInTheDocument();
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

  it("downloads yearly crime stats PDF on button click", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthly.mockResolvedValue({ data: [{ month: "2026-01", count: 2 }] });
    URL.createObjectURL = jest.fn(() => "blob:mock-url");
    mockDownloadPdf.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Incident Trends")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /pdf/i }));

    expect(mockDownloadPdf).toHaveBeenCalledTimes(1);
  });

  describe("average response time report downloads", () => {
    beforeEach(() => {
      authState.permissions = ["reports.view", "export.reports"];
      URL.createObjectURL = jest.fn(() => "blob:mock-url");
      URL.revokeObjectURL = jest.fn();
      mockSummary.mockResolvedValue({ data: mockData });
      mockDownloadResponseTime.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
    });

    it("offers a download button for each 3/6/9/12-month period", async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Avg Response Time")).toBeInTheDocument();
      });

      for (const months of [3, 6, 9, 12]) {
        expect(
          screen.getByRole("button", {
            name: `Download ${months}-month average response time report`,
          }),
        ).toBeInTheDocument();
      }
    });

    it("downloads the period matching the button clicked", async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Avg Response Time")).toBeInTheDocument();
      });

      await userEvent.click(
        screen.getByRole("button", {
          name: "Download 12-month average response time report",
        }),
      );

      expect(mockDownloadResponseTime).toHaveBeenCalledWith(12);
    });

    it("hides the buttons from users without the export.reports permission", async () => {
      authState.permissions = ["reports.view"];
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Avg Response Time")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("button", {
          name: "Download 12-month average response time report",
        }),
      ).not.toBeInTheDocument();
    });

    it("surfaces a download failure", async () => {
      mockDownloadResponseTime.mockRejectedValue(new Error("nope"));
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Avg Response Time")).toBeInTheDocument();
      });

      await userEvent.click(
        screen.getByRole("button", {
          name: "Download 3-month average response time report",
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByText("Failed to download 3-month response time report"),
        ).toBeInTheDocument();
      });
    });

    it("keeps the dashboard rendered when a download fails", async () => {
      mockDownloadResponseTime.mockRejectedValue(new Error("nope"));
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Avg Response Time")).toBeInTheDocument();
      });

      await userEvent.click(
        screen.getByRole("button", {
          name: "Download 3-month average response time report",
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByText("Failed to download 3-month response time report"),
        ).toBeInTheDocument();
      });
      // a 404 or expired trial must not replace every chart with a Retry button
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
      expect(screen.getByText("Response Time by Area")).toBeInTheDocument();
    });
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

describe("DashboardPage download failures and month gaps", () => {
  it("keeps the dashboard rendered when the yearly PDF download fails", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthly.mockResolvedValue({ data: [{ month: "2026-01", count: 2 }] });
    mockDownloadPdf.mockRejectedValue(new Error("nope"));
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Incident Trends")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /pdf/i }));

    expect(await screen.findByText("Failed to download PDF")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.getByText("Attempted incidents")).toBeInTheDocument();
  });

  it("compares the latest month with the calendar month before it when that month had no incidents", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthly.mockResolvedValue({
      data: [
        { month: "2026-06", count: 5 },
        { month: "2026-08", count: 3 },
      ],
    });
    render(<DashboardPage />);

    expect(await screen.findByText("Aug 2026 incidents")).toBeInTheDocument();
    expect(screen.getByText(/▲ 3 vs previous month/)).toBeInTheDocument();
  });
});

describe("fillMonthGaps", () => {
  it("inserts months with no incidents as zero across a year boundary", () => {
    expect(
      fillMonthGaps([
        { month: "2025-11", count: 1 },
        { month: "2026-02", count: 4 },
      ]),
    ).toEqual([
      { month: "2025-11", count: 1 },
      { month: "2025-12", count: 0 },
      { month: "2026-01", count: 0 },
      { month: "2026-02", count: 4 },
    ]);
  });

  it("returns an empty list unchanged", () => {
    expect(fillMonthGaps([])).toEqual([]);
  });
});

describe("fillMonthGaps with malformed keys", () => {
  it("returns the data unchanged instead of looping", () => {
    const data = [
      { month: "2026-01", count: 1 },
      { month: "NaN-NaN", count: 2 },
    ];
    expect(fillMonthGaps(data)).toBe(data);
  });
});
