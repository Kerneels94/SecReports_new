import { render, screen, waitFor } from "@testing-library/react";
import ReportsPage from "./page";
import { reportService } from "@/services";

jest.mock("next/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/services", () => ({
  reportService: { summary: jest.fn() },
}));

const mockSummary = reportService.summary as jest.Mock;

const mockData = {
  total: 42,
  byStatus: [
    { status: "open", _count: { id: 5 } },
    { status: "resolved", _count: { id: 20 } },
  ],
  recent: [
    { id: 1, title: "Incident A", status: "open", createdAt: "2026-05-01T00:00:00Z", reporter: { name: "Alice" } },
    { id: 2, title: "Incident B", status: "resolved", createdAt: "2026-05-10T00:00:00Z", reporter: undefined },
  ],
  assignedToMe: 0,
  overdueActions: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ReportsPage", () => {
  it("shows loading spinner initially", () => {
    mockSummary.mockReturnValue(new Promise(() => {}));
    render(<ReportsPage />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders total incidents card", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText("Total Incidents")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  it("renders byStatus list", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText("Incidents by Status")).toBeInTheDocument();
    });

    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("renders recent incidents", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText("Incident A")).toBeInTheDocument();
      expect(screen.getByText("Incident B")).toBeInTheDocument();
    });
  });

  it("shows reporter name in recent incidents", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
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

  it("shows empty states when no data", async () => {
    const emptyData = {
      total: 0,
      byStatus: [],
      recent: [],
      assignedToMe: 0,
      overdueActions: 0,
    };
    mockSummary.mockResolvedValue({ data: emptyData });
    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("No data available.")).toBeInTheDocument();
      expect(screen.getByText("No incidents reported yet.")).toBeInTheDocument();
    });
  });
});
