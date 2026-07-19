import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PatrolReportExportModal } from "./PatrolReportExportModal";
import { patrolExportService } from "@/services";

jest.mock("@/services", () => ({
  patrolExportService: {
    downloadCsv: jest.fn(),
    downloadPdf: jest.fn(),
    emailReport: jest.fn(),
  },
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

jest.mock("@/components/ui/Button", () => ({
  Button: ({ children, onClick, disabled, variant, "data-testid": testId, className }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; "data-testid"?: string; className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-testid={testId} data-variant={variant}>
      {children}
    </button>
  ),
}));

const mockDownloadPdf = patrolExportService.downloadPdf as jest.Mock;
const mockDownloadCsv = patrolExportService.downloadCsv as jest.Mock;
const mockEmailReport = patrolExportService.emailReport as jest.Mock;

const defaultFilters = {
  siteId: "site-1",
  siteName: "Test Site",
  dateFrom: "2026-01-01",
  dateTo: "2026-06-30",
};

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => "blob:mock-url");
  URL.revokeObjectURL = jest.fn();
});

describe("PatrolReportExportModal", () => {
  it("renders nothing when closed", () => {
    render(<PatrolReportExportModal open={false} onClose={jest.fn()} filters={defaultFilters} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the modal when open", () => {
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);
    expect(screen.getByRole("dialog", { name: "Export Patrol Report" })).toBeInTheDocument();
  });

  it("displays the site name in the description", () => {
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);
    expect(screen.getByText(/Test Site/)).toBeInTheDocument();
  });

  it("displays All Sites when no siteName is provided", () => {
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={{}} />);
    expect(screen.getByText(/All Sites/)).toBeInTheDocument();
  });

  it("shows PDF and CSV format buttons", () => {
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);
    expect(screen.getByRole("button", { name: /PDF/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /CSV/i })).toBeInTheDocument();
  });

  it("shows Download and Email action selector buttons", () => {
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);
    expect(screen.getByTestId("action-download")).toBeInTheDocument();
    expect(screen.getByTestId("action-email")).toBeInTheDocument();
  });

  it("calls downloadPdf when Download submit is clicked with PDF format", async () => {
    mockDownloadPdf.mockResolvedValue(new Blob(["pdf content"]));
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);

    await userEvent.click(screen.getByTestId("submit-download"));

    await waitFor(() => {
      expect(mockDownloadPdf).toHaveBeenCalledWith(defaultFilters);
    });
  });

  it("calls downloadCsv when CSV format is selected", async () => {
    mockDownloadCsv.mockResolvedValue(new Blob(["csv content"]));
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);

    await userEvent.click(screen.getByRole("button", { name: /CSV/i }));
    await userEvent.click(screen.getByTestId("submit-download"));

    await waitFor(() => {
      expect(mockDownloadCsv).toHaveBeenCalledWith(defaultFilters);
    });
  });

  it("shows email input when Email action is selected", async () => {
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);

    await userEvent.click(screen.getByTestId("action-email"));

    expect(screen.getByPlaceholderText("recipient@example.com")).toBeInTheDocument();
  });

  it("shows error for empty email on send", async () => {
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);

    await userEvent.click(screen.getByTestId("action-email"));
    await userEvent.click(screen.getByTestId("submit-email"));

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    });
  });

  it("sends email with valid address", async () => {
    mockEmailReport.mockResolvedValue({ data: { message: "Sent" } });
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);

    await userEvent.click(screen.getByTestId("action-email"));
    await userEvent.type(screen.getByPlaceholderText("recipient@example.com"), "test@example.com");
    await userEvent.click(screen.getByTestId("submit-email"));

    await waitFor(() => {
      expect(mockEmailReport).toHaveBeenCalledWith("test@example.com", "pdf", defaultFilters);
    });
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = jest.fn();
    render(<PatrolReportExportModal open={true} onClose={onClose} filters={defaultFilters} />);

    await userEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = jest.fn();
    render(<PatrolReportExportModal open={true} onClose={onClose} filters={defaultFilters} />);

    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows success state after email is sent", async () => {
    mockEmailReport.mockResolvedValue({ data: { message: "Sent" } });
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);

    await userEvent.click(screen.getByTestId("action-email"));
    await userEvent.type(screen.getByPlaceholderText("recipient@example.com"), "test@example.com");
    await userEvent.click(screen.getByTestId("submit-email"));

    await waitFor(() => {
      expect(screen.getByText(/sent to/)).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("shows error on download failure", async () => {
    mockDownloadPdf.mockRejectedValue(new Error("Download failed"));
    render(<PatrolReportExportModal open={true} onClose={jest.fn()} filters={defaultFilters} />);

    await userEvent.click(screen.getByTestId("submit-download"));

    await waitFor(() => {
      expect(screen.getByText("Failed to download report. Please try again.")).toBeInTheDocument();
    });
  });
});
