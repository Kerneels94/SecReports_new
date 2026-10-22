import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminInvoicesPage from "./page";
import { adminInvoiceService } from "@/services";
import type { Invoice } from "@/types";

jest.mock("@/services", () => ({
  adminInvoiceService: {
    list: jest.fn(),
    send: jest.fn(),
    markAsPaid: jest.fn(),
    markAsOverdue: jest.fn(),
  },
}));

const mockList = adminInvoiceService.list as jest.Mock;
const mockSend = adminInvoiceService.send as jest.Mock;

const draft: Invoice = {
  id: "inv1",
  companyId: "c1",
  invoiceNumber: "INV-2026-0001",
  amount: 150000,
  currency: "ZAR",
  status: "draft",
  dueDate: "2026-10-25T00:00:00.000Z",
  paidAt: null,
  periodStart: null,
  periodEnd: null,
  description: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  company: { id: "c1", name: "Acme Security", email: "acme@example.com" },
};

describe("AdminInvoicesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue({ data: [draft] });
  });

  it("disables Send while the request runs, so a double-click sends once", async () => {
    let finishSend: () => void = () => {};
    mockSend.mockReturnValue(new Promise<void>((resolve) => (finishSend = resolve)));
    render(<AdminInvoicesPage />);

    const sendButton = await screen.findByRole("button", { name: "Send" });
    await userEvent.click(sendButton);

    expect(sendButton).toBeDisabled();
    await userEvent.click(sendButton);
    expect(mockSend).toHaveBeenCalledTimes(1);

    finishSend();
    await waitFor(() => expect(screen.getByText("Invoice sent via email")).toBeInTheDocument());
  });
});
