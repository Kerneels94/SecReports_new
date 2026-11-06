import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IncidentsPage from "./page";
import { incidentService, reportService, exportService } from "@/services";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, role: "manager", name: "Manager", email: "m@test.com", status: "active", companyId: 1, permissions: ["incidents.view", "incidents.create", "reports.view", "export.csv", "export.reports"] },
  }),
}));

jest.mock("@/services", () => ({
  incidentService: { list: jest.fn() },
  reportService: { summary: jest.fn(), batchEmail: jest.fn() },
  exportService: { downloadPdf: jest.fn() },
}));

const mockList = incidentService.list as jest.Mock;
const mockSummary = reportService.summary as jest.Mock;

const mockIncidents = [
  {
    id: 1,
    referenceNumber: "SEC-001",
    title: "Server Breach",
    propertyAddress: "12 Main Road",
    operatorName: "Sipho Dlamini",
    status: "under_review",
    type: "security",
    reporter: { name: "Alice" },
    createdAt: "2026-05-01T00:00:00Z",
  },
  {
    id: 2,
    referenceNumber: "SEC-002",
    title: "Phishing Attempt",
    propertyAddress: "45 Church Street",
    operatorName: "Thandi Nkosi",
    status: "submitted",
    type: "phishing",
    reporter: null,
    createdAt: "2026-05-15T00:00:00Z",
  },
];

const mockPaginated = {
  data: mockIncidents,
  total: 25,
  page: 1,
  perPage: 10,
};

const mockSummaryData = {
  total: 42,
  attemptedCount: 10,
  positiveCount: 5,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("IncidentsPage", () => {
  it("shows loading spinner initially", () => {
    mockList.mockReturnValue(new Promise(() => {}));
    mockSummary.mockReturnValue(new Promise(() => {}));
    render(<IncidentsPage />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders summary cards", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Total incidents")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getAllByText("Attempted").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Positive").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders Email All buttons when counts are positive", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Email all")).toHaveLength(2);
    });
  });

  it("renders table with incident data", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
      expect(screen.getByText("12 Main Road")).toBeInTheDocument();
      expect(screen.getByText("SEC-002")).toBeInTheDocument();
      expect(screen.getByText("45 Church Street")).toBeInTheDocument();
      expect(screen.getByText("Sipho Dlamini")).toBeInTheDocument();
      expect(screen.getByText("Thandi Nkosi")).toBeInTheDocument();
    });
  });

  it("uses compact table text inside a horizontally scrollable wrapper", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    const table = await screen.findByRole("table");
    expect(table.className).toContain("text-sm");
    expect(table.parentElement?.className).toContain("overflow-x-auto");
    expect(table.querySelector("th")?.className).toContain("whitespace-nowrap");
  });

  it("shows total count", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("25 total incidents")).toBeInTheDocument();
    });
  });

  it("renders action buttons per row", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getAllByTitle("View")).toHaveLength(2);
      expect(screen.getAllByTitle("Download PDF")).toHaveLength(2);
      expect(screen.getAllByTitle("Email")).toHaveLength(2);
    });
  });

  it("renders pagination controls when multiple pages", async () => {
    const manyItems = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      referenceNumber: `SEC-${String(i + 1).padStart(3, "0")}`,
      title: `Incident ${i + 1}`,
      status: "draft",
      type: "other",
      reporter: null,
      createdAt: "2026-01-01T00:00:00Z",
    }));

    mockList.mockResolvedValue({
      data: { data: manyItems, total: 50, page: 1, perPage: 10 },
    });
    mockSummary.mockResolvedValue({ data: mockSummaryData });

    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
  });

  it("pagination next/previous changes page", async () => {
    mockList.mockResolvedValue({
      data: { data: mockIncidents, total: 50, page: 1, perPage: 10 },
    });
    mockSummary.mockResolvedValue({ data: mockSummaryData });

    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
    });

    mockList.mockResolvedValue({
      data: { data: mockIncidents, total: 50, page: 2, perPage: 10 },
    });

    await userEvent.click(screen.getByText("Next"));

    await waitFor(() => {
      expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
    });
  });

  it("shows error state with retry", async () => {
    mockList.mockRejectedValue(new Error("Failed"));
    mockSummary.mockRejectedValue(new Error("Failed"));
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load incidents")).toBeInTheDocument();
    });

    expect(screen.getByText("Retry")).toBeInTheDocument();

    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    await userEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
    });
  });

  it("shows empty state when no incidents", async () => {
    mockList.mockResolvedValue({
      data: { data: [], total: 0, page: 1, perPage: 10 },
    });
    mockSummary.mockResolvedValue({ data: { total: 0, attemptedCount: 0, positiveCount: 0 } });

    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No incidents found.")).toBeInTheDocument();
    });

    expect(screen.getByText("Report your first incident")).toBeInTheDocument();
  });

  it("does not render Report Incident button", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
    });

    expect(screen.queryByText("Report incident")).not.toBeInTheDocument();
  });

  it("passes date and type filters to the service", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText("Date from"), "2026-05-01");
    await userEvent.type(screen.getByLabelText("Date to"), "2026-05-31");
    await userEvent.selectOptions(screen.getByLabelText("Type"), "attempted");

    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith({
        page: "1",
        perPage: "10",
        dateFrom: "2026-05-01",
        dateTo: "2026-05-31",
        type: "attempted",
      });
    });
  });

  it("passes debounced search to the service", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText("Search"), "alice");

    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith({
        page: "1",
        perPage: "10",
        search: "alice",
      });
    });
  });

  it("shows Clear button when a filter is active and resets on click", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByLabelText("Type"), "positive");
    await waitFor(() => {
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Clear"));
    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith({ page: "1", perPage: "10" });
    });
  });
});

describe("IncidentsPage dates and downloads", () => {
  it("shows the incident date, not the date the report was created", async () => {
    mockList.mockResolvedValue({
      data: {
        ...mockPaginated,
        data: [{ ...mockIncidents[0], incidentDate: "2026-04-28T00:00:00.000Z", createdAt: "2026-05-01T06:10:00Z" }],
      },
    });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    render(<IncidentsPage />);

    expect(await screen.findByText("28/04/2026")).toBeInTheDocument();
    expect(screen.queryByText("01/05/2026")).not.toBeInTheDocument();
  });

  it("keeps the incident table when a PDF download fails", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    (exportService.downloadPdf as jest.Mock).mockRejectedValue(new Error("nope"));
    render(<IncidentsPage />);

    await screen.findByText("SEC-001");
    await userEvent.click(screen.getAllByTitle("Download PDF")[0]);

    expect(await screen.findByText("Failed to download PDF")).toBeInTheDocument();
    expect(screen.getByText("SEC-001")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});
