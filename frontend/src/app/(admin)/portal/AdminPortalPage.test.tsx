import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPortalPage from "./page";
import { adminRevenueService, adminInvoiceService } from "@/services";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/services", () => ({
  adminRevenueService: { stats: jest.fn(), trends: jest.fn() },
  adminInvoiceService: { list: jest.fn(), generateMonthly: jest.fn(), markAsPaid: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (adminRevenueService.stats as jest.Mock).mockResolvedValue({
    data: {
      totalRevenue: 0,
      monthlyRevenue: 0,
      paidInvoicesThisYear: 0,
      overdueInvoices: 0,
      outstandingAmount: 0,
      activeCompanies: 4,
      trialCompanies: 7,
    },
  });
  (adminRevenueService.trends as jest.Mock).mockResolvedValue({ data: [] });
  (adminInvoiceService.list as jest.Mock).mockResolvedValue({ data: [] });
});

describe("AdminPortalPage", () => {
  it("shows how many companies are on trial", async () => {
    render(<AdminPortalPage />);

    expect(await screen.findByText("On Trial")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("does not email every client when the admin cancels the confirm", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminPortalPage />);

    await userEvent.click(await screen.findByRole("button", { name: /generate & send/i }));

    expect(adminInvoiceService.generateMonthly).not.toHaveBeenCalled();
  });
});
