import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IncidentsPage from "./page";
import { incidentService } from "@/services";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/services", () => ({
  incidentService: { list: jest.fn() },
}));

const mockList = incidentService.list as jest.Mock;

const mockIncidents = [
  {
    id: 1,
    referenceNumber: "SEC-001",
    title: "Server Breach",
    status: "under_review",
    type: "security",
    reporter: { name: "Alice" },
    createdAt: "2026-05-01T00:00:00Z",
  },
  {
    id: 2,
    referenceNumber: "SEC-002",
    title: "Phishing Attempt",
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
  perPage: 20,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("IncidentsPage", () => {
  it("shows loading spinner initially", () => {
    mockList.mockReturnValue(new Promise(() => {}));
    render(<IncidentsPage />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders table with incident data", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
      expect(screen.getByText("Server Breach")).toBeInTheDocument();
      expect(screen.getByText("SEC-002")).toBeInTheDocument();
      expect(screen.getByText("Phishing Attempt")).toBeInTheDocument();
    });
  });

  it("shows total count", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("25 total incidents")).toBeInTheDocument();
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
      data: { data: manyItems, total: 25, page: 1, perPage: 20 },
    });

    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
  });

  it("pagination next/previous changes page", async () => {
    mockList.mockResolvedValue({
      data: { data: mockIncidents, total: 25, page: 1, perPage: 20 },
    });

    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });

    mockList.mockResolvedValue({
      data: { data: mockIncidents, total: 25, page: 2, perPage: 20 },
    });

    await userEvent.click(screen.getByText("Next"));

    await waitFor(() => {
      expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
    });
  });

  it("shows error state with retry", async () => {
    mockList.mockRejectedValue(new Error("Failed"));
    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load incidents")).toBeInTheDocument();
    });

    expect(screen.getByText("Retry")).toBeInTheDocument();

    mockList.mockResolvedValue({ data: mockPaginated });
    await userEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
    });
  });

  it("shows empty state when no incidents", async () => {
    mockList.mockResolvedValue({
      data: { data: [], total: 0, page: 1, perPage: 20 },
    });

    render(<IncidentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No incidents found.")).toBeInTheDocument();
    });

    expect(screen.getByText("Report your first incident")).toBeInTheDocument();
  });

  it("renders Report Incident button", async () => {
    mockList.mockResolvedValue({ data: mockPaginated });
    render(<IncidentsPage />);

    await waitFor(() => {
      const reportBtn = screen.getByText("Report Incident");
      expect(reportBtn.closest("a")).toHaveAttribute("href", "/incidents/new");
    });
  });
});
