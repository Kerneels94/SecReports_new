import type { ComponentProps } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthlyCrimeReportModal } from "./MonthlyCrimeReportModal";
import { exportService } from "@/services";

jest.mock("@/services", () => ({
  exportService: { downloadMonthlyCrimePdf: jest.fn() },
}));

const mockDownload = exportService.downloadMonthlyCrimePdf as jest.Mock;

const setup = (overrides: Partial<ComponentProps<typeof MonthlyCrimeReportModal>> = {}) => {
  const onClose = jest.fn();
  const onDownloaded = jest.fn();
  render(
    <MonthlyCrimeReportModal
      open
      onClose={onClose}
      onDownloaded={onDownloaded}
      {...overrides}
    />,
  );
  return { onClose, onDownloaded };
};

describe("MonthlyCrimeReportModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rejects a range where the end is not after the start", async () => {
    setup();

    const [from, to] = screen.getAllByLabelText(/from|to/i) as HTMLInputElement[];
    fireEvent.change(from, { target: { value: "2026-02-01T10:00" } });
    fireEvent.change(to, { target: { value: "2026-01-01T10:00" } });

    await userEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(
      screen.getByText("The end date must be after the start date."),
    ).toBeInTheDocument();
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("downloads the chosen range and closes", async () => {
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    mockDownload.mockResolvedValue(blob);
    const { onClose, onDownloaded } = setup();

    const [from, to] = screen.getAllByLabelText(/from|to/i) as HTMLInputElement[];
    fireEvent.change(from, { target: { value: "2026-01-01T08:00" } });
    fireEvent.change(to, { target: { value: "2026-02-01T17:30" } });

    await userEvent.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => expect(onDownloaded).toHaveBeenCalledWith(blob));
    expect(mockDownload).toHaveBeenCalledWith(
      new Date("2026-01-01T08:00").toISOString(),
      new Date("2026-02-01T17:30").toISOString(),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("surfaces a download failure", async () => {
    mockDownload.mockRejectedValue(new Error("nope"));
    setup();

    await userEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(
      await screen.findByText("Failed to download the monthly crime stat report"),
    ).toBeInTheDocument();
  });
});
