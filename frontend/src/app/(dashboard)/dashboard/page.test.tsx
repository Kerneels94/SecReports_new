import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage, { aggregateYearly, fillMonthGaps, utcMonthKey } from "./page";
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
  exportService: { downloadYearlyPdf: jest.fn(), downloadMonthlyCrimePdf: jest.fn(), downloadResponseTimePdf: jest.fn() },
}));

const mockSummary = reportService.summary as jest.Mock;
const mockMonthly = reportService.monthlyStats as jest.Mock;
const mockMonthlyResponse = reportService.monthlyResponse as jest.Mock;
const mockResponseByArea = reportService.responseByArea as jest.Mock;
const mockDownloadPdf = exportService.downloadYearlyPdf as jest.Mock;
const mockDownloadMonthlyCrime = exportService.downloadMonthlyCrimePdf as jest.Mock;
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

// Pin the clock: the 3-month response average uses the current date, and the
// fixtures below use early-2026 months.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date("2026-04-15T12:00:00Z"),
    doNotFake: ["nextTick", "setImmediate", "clearImmediate", "setInterval", "clearInterval", "setTimeout", "clearTimeout", "queueMicrotask", "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback", "hrtime", "performance"],
  });
});
afterAll(() => jest.useRealTimers());

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

  it("shows zinc skeleton blocks for response cards while they load", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthlyResponse.mockReturnValue(new Promise(() => {}));
    mockResponseByArea.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);

    expect(
      await screen.findByText("Loading area response data"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading response time data")).toBeInTheDocument();
    expect(document.querySelectorAll(".bg-zinc-600").length).toBeGreaterThan(0);
    expect(screen.queryByText("No area response data yet.")).not.toBeInTheDocument();
  });

  it("renders stat cards with correct labels", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Attempted")[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText("Positive")[0]).toBeInTheDocument();
    expect(screen.getByText("Total incidents")).toBeInTheDocument();
  });

  it("uses compact stat labels and lets the trend card header wrap", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    const label = await screen.findByText("Total incidents");
    expect(label.className).toContain("text-sm");

    const trendHeader = screen.getByTestId("trend-header");
    expect(trendHeader.className).toContain("flex-wrap");
  });

  it("renders stat card values", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("25").length).toBeGreaterThan(0);
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

    expect(screen.getAllByText("7").length).toBeGreaterThan(0);
    expect(screen.getByText(/3 fewer than Mar 2026/)).toBeInTheDocument();
  });

  it("renders avg response time chart", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthlyResponse.mockResolvedValue({
      data: [
        { month: "2026-01", avgMs: 1800000, count: 1 },
        { month: "2026-02", avgMs: 1320000, count: 1 },
      ],
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Average response time")).toBeInTheDocument();
    });

    expect(screen.getByText("3-month average")).toBeInTheDocument();
  });

  it("averages only the latest 3 months for the headline response stat", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthlyResponse.mockResolvedValue({
      data: [
        { month: "2026-01", avgMs: 6000000, count: 1 },
        { month: "2026-02", avgMs: 600000, count: 1 },
        { month: "2026-03", avgMs: 1200000, count: 1 },
        { month: "2026-04", avgMs: 2400000, count: 1 },
      ],
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("23m 20s")).toBeInTheDocument();
    });
  });

  it("averages the last 3 calendar months, skipping stale data and gaps", async () => {
      mockSummary.mockResolvedValue({ data: mockData });
      mockMonthlyResponse.mockResolvedValue({
        data: [
          { month: "2026-01", avgMs: 6000000, count: 5 },
          { month: "2026-02", avgMs: 600000, count: 1 },
          { month: "2026-04", avgMs: 1200000, count: 1 },
        ],
      });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("15m 0s")).toBeInTheDocument();
      });
  });

  it("shows — for the 3-month average when every sample is older than the window", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthlyResponse.mockResolvedValue({
      data: [
        { month: "2025-11", avgMs: 6000000, count: 2 },
        { month: "2026-01", avgMs: 600000, count: 1 },
      ],
    });
    render(<DashboardPage />);

    const label = await screen.findByText("3-month average");
    expect(label.parentElement).toHaveTextContent("—");
  });

  it("ignores future-dated months in the 3-month average", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthlyResponse.mockResolvedValue({
      data: [
        { month: "2026-04", avgMs: 600000, count: 1 },
        { month: "2026-09", avgMs: 6000000, count: 1 },
      ],
    });
    render(<DashboardPage />);

    const label = await screen.findByText("3-month average");
    expect(label.parentElement).toHaveTextContent("10m 0s");
  });

  it("weights the headline response stat by monthly incident count", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthlyResponse.mockResolvedValue({
      data: [
        { month: "2026-03", avgMs: 6000000, count: 1 },
        { month: "2026-04", avgMs: 600000, count: 9 },
      ],
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("19m 0s")).toBeInTheDocument();
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
      expect(screen.getByText("Response time by area")).toBeInTheDocument();
    });

    expect(screen.getByText("North CBD")).toBeInTheDocument();
    expect(screen.getByText("30m 0s")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("paginates the response time by area list", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockResponseByArea.mockResolvedValue({
      data: Array.from({ length: 25 }, (_, i) => ({
        area: `Area ${String(i + 1).padStart(2, "0")}`,
        avgMs: 60000,
        count: 1,
      })),
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });
    expect(screen.getByText("Area 01")).toBeInTheDocument();
    expect(screen.queryByText("Area 11")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Area 11")).toBeInTheDocument();
    expect(screen.queryByText("Area 01")).not.toBeInTheDocument();
  });

  it("paginates the response time by area list", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockResponseByArea.mockResolvedValue({
      data: Array.from({ length: 25 }, (_, i) => ({
        area: `Area ${String(i + 1).padStart(2, "0")}`,
        avgMs: 60000,
        count: 1,
      })),
    });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });
    expect(screen.getByText("Area 01")).toBeInTheDocument();
    expect(screen.queryByText("Area 11")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Area 11")).toBeInTheDocument();
    expect(screen.queryByText("Area 01")).not.toBeInTheDocument();
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

    expect(screen.getAllByText("Attempted")[0]).toBeInTheDocument();
    expect(screen.getByText("Incident trends")).toBeInTheDocument();
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
      expect(screen.getAllByText("Attempted")[0]).toBeInTheDocument();
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
      expect(screen.getByText("Incident trends")).toBeInTheDocument();
    });

    const monthlyBtn = screen.getByText("monthly").closest("button")!;
    const yearlyBtn = screen.getByText("yearly").closest("button")!;
    expect(monthlyBtn.className).toContain("bg-primary");

    await userEvent.click(yearlyBtn);
    expect(yearlyBtn.className).toContain("bg-primary");
  });

  it("downloads yearly crime stats PDF on button click", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockMonthly.mockResolvedValue({ data: [{ month: "2026-01", count: 2 }] });
    URL.createObjectURL = jest.fn(() => "blob:mock-url");
    mockDownloadPdf.mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Incident trends")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Yearly Crime Stat report" }),
    );

    expect(mockDownloadPdf).toHaveBeenCalledTimes(1);
  });

  it("opens the monthly crime stat modal and downloads the chosen range", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    URL.createObjectURL = jest.fn(() => "blob:mock-url");
    mockDownloadMonthlyCrime.mockResolvedValue(
      new Blob(["%PDF"], { type: "application/pdf" }),
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Monthly Crime Stat report" }),
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Monthly Crime Stat report" }),
    );

    const dialog = screen.getByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Download" }),
    );

    expect(mockDownloadMonthlyCrime).toHaveBeenCalledTimes(1);
    const [from, to] = mockDownloadMonthlyCrime.mock.calls[0];
    expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
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
        expect(screen.getByText("Average response time")).toBeInTheDocument();
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
        expect(screen.getByText("Average response time")).toBeInTheDocument();
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
        expect(screen.getByText("Average response time")).toBeInTheDocument();
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
        expect(screen.getByText("Average response time")).toBeInTheDocument();
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
        expect(screen.getByText("Average response time")).toBeInTheDocument();
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
      expect(screen.getByText("Response time by area")).toBeInTheDocument();
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
      expect(screen.getByText("Incident trends")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Yearly Crime Stat report" }),
    );

    expect(await screen.findByText("Failed to download PDF")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Attempted")[0]).toBeInTheDocument();
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
    expect(screen.getByText(/3 more than Jul 2026/)).toBeInTheDocument();
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

describe("utcMonthKey", () => {
  it("uses the UTC month, not the browser's local month", () => {
    // 00:30 UTC on 1 May is still 30 April in Los Angeles.
    expect(utcMonthKey(new Date("2026-05-01T00:30:00Z"))).toBe("2026-05");
  });

  it("shifts back across a year boundary", () => {
    expect(utcMonthKey(new Date("2026-01-15T00:00:00Z"), -2)).toBe("2025-11");
  });
});
