import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IncidentDetailModal } from "./IncidentDetailModal";
import { incidentService, exportService } from "@/services";

jest.mock("@/services", () => ({
  incidentService: { getById: jest.fn() },
  exportService: { downloadPdf: jest.fn() },
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

jest.mock("@/components/map/LocationMap", () => ({
  LocationMap: ({ lat, lng }: { lat: number; lng: number }) => (
    <div data-testid="location-map">{`${lat},${lng}`}</div>
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
  alarmType: "Panic",
  latitude: -26.1,
  longitude: 28.05,
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

    expect(screen.getAllByText("Security").length).toBeGreaterThan(0);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("John Operator")).toBeInTheDocument();
    expect(screen.getByText("Jane Dispatcher")).toBeInTheDocument();
    expect(screen.getByText("AR-42")).toBeInTheDocument();
    // Shown in the Client & Property card and as the map caption.
    expect(screen.getAllByText("123 Main St").length).toBeGreaterThan(0);
    expect(screen.getByText("Bob Client")).toBeInTheDocument();
    expect(screen.getByText("C-001")).toBeInTheDocument();
    expect(screen.getByText("Biz Hub")).toBeInTheDocument();
    expect(screen.getByText("SAPS-123")).toBeInTheDocument();
  });

  it("wraps long unbroken values and descriptions instead of overflowing", async () => {
    const longValue = "v".repeat(300);
    const longDescription = "d".repeat(300);
    mockGetById.mockResolvedValue({
      data: { ...mockIncident, operatorName: longValue, description: longDescription },
    });
    render(<IncidentDetailModal incidentId={1} open={true} onClose={jest.fn()} />);

    for (const el of [await screen.findByText(longValue), screen.getByText(longDescription)]) {
      expect(el.className).toContain("[overflow-wrap:anywhere]");
    }
    expect(screen.getByRole("dialog").className).toContain("overflow-x-hidden");
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

describe("IncidentDetailModal download failure", () => {
  it("keeps the incident details when the PDF download fails", async () => {
    mockGetById.mockResolvedValue({ data: mockIncident });
    (exportService.downloadPdf as jest.Mock).mockRejectedValue(new Error("nope"));
    render(<IncidentDetailModal incidentId={1} open={true} onClose={jest.fn()} />);

    await userEvent.click(await screen.findByRole("button", { name: /download pdf/i }));

    expect(await screen.findByText("Failed to download PDF")).toBeInTheDocument();
    expect(screen.getByText("Server Breach")).toBeInTheDocument();
  });

  it("shows the alarm type, the pinned map and a Google Maps link", async () => {
    mockGetById.mockResolvedValue({ data: mockIncident });
    render(<IncidentDetailModal incidentId={1} open={true} onClose={jest.fn()} />);

    expect(await screen.findByTestId("location-map")).toHaveTextContent("-26.1,28.05");
    expect(screen.getByText("Panic")).toBeInTheDocument();
    expect(screen.getByText("Incident Type")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open in google maps/i })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=-26.1,28.05",
    );
  });

  it("shows a placeholder instead of the map when the incident has no coordinates", async () => {
    mockGetById.mockResolvedValue({ data: { ...mockIncident, latitude: null, longitude: null, alarmType: null } });
    render(<IncidentDetailModal incidentId={1} open={true} onClose={jest.fn()} />);

    expect(await screen.findByText(/No location pinned/)).toBeInTheDocument();
    expect(screen.queryByTestId("location-map")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open in google maps/i })).not.toBeInTheDocument();
  });
});
