import { render, screen, waitFor } from "@testing-library/react";
import ReportsPage from "./page";

jest.mock("next/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockSummary = jest.fn();
const mockList = jest.fn();

jest.mock("@/services", () => ({
  reportService: {
    summary: (...args: unknown[]) => mockSummary(...args),
    batchEmail: jest.fn(),
  },
  incidentService: { list: (...args: unknown[]) => mockList(...args) },
  exportService: { downloadPdf: jest.fn(), downloadCsv: jest.fn(), emailReport: jest.fn() },
}));

const mockSummaryData = {
  total: 42,
  byStatus: [
    { status: "open", _count: { id: 5 } },
    { status: "resolved", _count: { id: 20 } },
  ],
  recent: [
    { id: 1, title: "Incident A", status: "open", createdAt: "2026-05-01T00:00:00Z", reporter: { name: "Alice" } },
    { id: 2, title: "Incident B", status: "resolved", createdAt: "2026-05-10T00:00:00Z", reporter: undefined },
  ],
  attemptedCount: 10,
  positiveCount: 5,
};

const mockListData = {
  data: [
    { id: 1, referenceNumber: "REF-001", title: "Incident A", type: "Theft", status: "open", createdAt: "2026-05-01T00:00:00Z", reporter: { name: "Alice" } },
    { id: 2, referenceNumber: "REF-002", title: "Incident B", type: "Vandalism", status: "resolved", createdAt: "2026-05-10T00:00:00Z", reporter: undefined },
  ],
  total: 2,
  page: 1,
  perPage: 20,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ReportsPage", () => {
  it("shows loading spinner initially", () => {
    mockSummary.mockReturnValue(new Promise(() => {}));
    mockList.mockReturnValue(new Promise(() => {}));
    render(<ReportsPage />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders total incidents card", async () => {
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    mockList.mockResolvedValue({ data: mockListData });
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText("Total Incidents")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  it("renders attempted and positive cards with email buttons", async () => {
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    mockList.mockResolvedValue({ data: mockListData });
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Email All")).toHaveLength(2);
  });

  it("renders filter inputs", async () => {
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    mockList.mockResolvedValue({ data: mockListData });
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Date From")).toBeInTheDocument();
      expect(screen.getByLabelText("Date To")).toBeInTheDocument();
      expect(screen.getByLabelText("Type")).toBeInTheDocument();
    });
  });


  it("renders all incidents table with actions", async () => {
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    mockList.mockResolvedValue({ data: mockListData });
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText("Incident A")).toBeInTheDocument();
      expect(screen.getByText("Incident B")).toBeInTheDocument();
    });

    expect(screen.getByText("REF-001")).toBeInTheDocument();
    expect(screen.getByText("REF-002")).toBeInTheDocument();
    expect(screen.getAllByText("Theft").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Vandalism").length).toBeGreaterThanOrEqual(1);
  });

  it("shows reporter name in the table", async () => {
    mockSummary.mockResolvedValue({ data: mockSummaryData });
    mockList.mockResolvedValue({ data: mockListData });
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
    });
  });

  it("shows error state", async () => {
    mockSummary.mockRejectedValue(new Error("Failed"));
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load reports")).toBeInTheDocument();
    });
  });

  it("shows empty state when no incidents", async () => {
    const emptySummary = { total: 0, byStatus: [], recent: [], attemptedCount: 0, positiveCount: 0 };
    const emptyList = { data: [], total: 0, page: 1, perPage: 20 };
    mockSummary.mockResolvedValue({ data: emptySummary });
    mockList.mockResolvedValue({ data: emptyList });
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(3);
      expect(screen.getByText("No data available.")).toBeInTheDocument();
      expect(screen.getByText("No incidents found.")).toBeInTheDocument();
    });
  });
});
