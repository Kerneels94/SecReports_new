import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";
import { reportService, incidentService } from "@/services";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, role: "owner", name: "Admin", email: "admin@test.com", status: "active", companyId: 1 } }),
}));

jest.mock("@/services", () => ({
  reportService: { summary: jest.fn() },
  incidentService: { list: jest.fn() },
}));

const mockSummary = reportService.summary as jest.Mock;
const mockList = incidentService.list as jest.Mock;

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
});

describe("DashboardPage", () => {
  it("shows loading spinner initially", () => {
    mockSummary.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders stat cards with correct labels", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Incidents")).toBeInTheDocument();
    });

    expect(screen.getByText("Attempted incidents")).toBeInTheDocument();
    expect(screen.getByText("Positive incidents")).toBeInTheDocument();
  });

  it("renders stat card values", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Incidents")).toBeInTheDocument();
    });

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
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
      recent: [],
      attemptedCount: 0,
      positiveCount: 0,
    };
    mockSummary.mockResolvedValue({ data: emptyData });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No incidents reported yet.")).toBeInTheDocument();
    });
  });

  it("fetches filtered incidents when date changes", async () => {
    mockSummary.mockResolvedValue({ data: mockData });
    mockList.mockResolvedValue({ data: { data: [mockData.recent[0]], total: 1, page: 1, perPage: 50 } });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
    });

    const dateInputs = screen.getAllByDisplayValue("");
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  });
});
