import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IncidentDetailModal } from "./IncidentDetailModal";
import { incidentService } from "@/services";

jest.mock("@/services", () => ({
  incidentService: { getById: jest.fn() },
}));

jest.mock("@/components/ui/Modal", () => ({
  Modal: ({ open, onClose, title, children, className }: {
    open: boolean; onClose: () => void; title?: string; children: React.ReactNode; className?: string;
  }) =>
    open ? (
      <div role="dialog" aria-label={title} className={className}>
        {title && <button aria-label="Close" onClick={onClose}>×</button>}
        {children}
      </div>
    ) : null,
}));

jest.mock("@/components/ui/Badge", () => ({
  Badge: ({ children, variant, dot }: { children: React.ReactNode; variant?: string; dot?: boolean }) => (
    <span data-variant={variant} data-dot={dot}>{children}</span>
  ),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, role: "manager", permissions: ["incidents.view", "export.csv"] } }),
}));

const mockGetById = incidentService.getById as jest.Mock;

const mockIncident = {
  id: 1,
  referenceNumber: "SEC-001",
  title: "Server Breach",
  description: "Unauthorized access detected in server room B.",
  type: "Security",
  status: "under_review",
  incidentDate: "2026-05-01T00:00:00Z",
  location: "Server Room B",
  operatorName: "John Operator",
  dispatcher: "Jane Dispatcher",
  dispatchTime: "2026-05-01T08:30:00Z",
  arrivalTime: "2026-05-01T08:45:00Z",
  callSign: "AR-42",
  propertyAddress: "123 Main St",
  clientName: "Bob Client",
  clientCode: "C-001",
  businessOrComplex: "Biz Hub",
  sapsReference: "SAPS-123",
  reporterId: 1,
  assignedTo: 2,
  createdAt: "2026-05-01T08:00:00Z",
  updatedAt: "2026-05-02T10:00:00Z",
  reporter: { id: 1, name: "Alice" },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("IncidentDetailModal", () => {
  it("renders nothing when closed", () => {
    render(<IncidentDetailModal incidentId={1} open={false} onClose={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows loading state when opened", () => {
    mockGetById.mockReturnValue(new Promise(() => {}));
    render(<IncidentDetailModal incidentId={1} open={true} onClose={jest.fn()} />);
    expect(screen.getByText("Loading incident...")).toBeInTheDocument();
  });

  it("renders incident details after loading", async () => {
    mockGetById.mockResolvedValue({ data: mockIncident });
    render(<IncidentDetailModal incidentId={1} open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("SEC-001")).toBeInTheDocument();
      expect(screen.getByText("Server Breach")).toBeInTheDocument();
      expect(screen.getByText("Unauthorized access detected in server room B.")).toBeInTheDocument();
    });

    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Server Room B")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("John Operator")).toBeInTheDocument();
    expect(screen.getByText("Jane Dispatcher")).toBeInTheDocument();
    expect(screen.getByText("AR-42")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(screen.getByText("Bob Client")).toBeInTheDocument();
    expect(screen.getByText("C-001")).toBeInTheDocument();
    expect(screen.getByText("Biz Hub")).toBeInTheDocument();
    expect(screen.getByText("SAPS-123")).toBeInTheDocument();
  });

  it("shows error state with retry", async () => {
    mockGetById.mockRejectedValue(new Error("Failed"));
    render(<IncidentDetailModal incidentId={1} open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load incident")).toBeInTheDocument();
    });

    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("retry refetches incident on error", async () => {
    mockGetById.mockRejectedValue(new Error("Failed"));
    render(<IncidentDetailModal incidentId={1} open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load incident")).toBeInTheDocument();
    });

    mockGetById.mockResolvedValue({ data: mockIncident });

    await userEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Server Breach")).toBeInTheDocument();
    });
  });

  it("handles missing optional fields", async () => {
    mockGetById.mockResolvedValue({
      data: {
        ...mockIncident,
        location: null,
        reporter: undefined,
        dispatchTime: null,
        arrivalTime: null,
        callSign: null,
        propertyAddress: null,
        clientName: null,
        clientCode: null,
        businessOrComplex: null,
        sapsReference: null,
      },
    });

    render(<IncidentDetailModal incidentId={1} open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("-")).toBeInTheDocument();
      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });
  });

  it("calls onClose when close button clicked", async () => {
    const onClose = jest.fn();
    mockGetById.mockResolvedValue({ data: mockIncident });
    render(<IncidentDetailModal incidentId={1} open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Server Breach")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders section headings", async () => {
    mockGetById.mockResolvedValue({ data: mockIncident });
    render(<IncidentDetailModal incidentId={1} open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Personnel")).toBeInTheDocument();
      expect(screen.getByText("Response")).toBeInTheDocument();
      expect(screen.getByText("Client & Property")).toBeInTheDocument();
      expect(screen.getByText("Details")).toBeInTheDocument();
    });
  });
});
