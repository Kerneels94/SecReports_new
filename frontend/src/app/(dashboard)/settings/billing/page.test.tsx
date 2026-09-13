import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BillingPage from "./page";
import { subscriptionService } from "@/services";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "1", role: "admin", companyId: "c1", name: "Admin", email: "a@b.com", status: "active", permissions: ["billing.manage"] },
  }),
}));

jest.mock("@/services", () => ({
  subscriptionService: {
    listPlans: jest.fn(),
    getSubscription: jest.fn(),
    changePlan: jest.fn(),
  },
}));

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    siteLimit: 0,
    userLimit: 0,
    trialPeriodDays: 14,
    features: "[]",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Professional",
    price: 150000,
    siteLimit: 15,
    userLimit: 5,
    trialPeriodDays: null,
    features: "[\"15 sites\"]",
    highlighted: true,
  },
];

const currentSub = {
  id: "s1",
  companyId: "c1",
  planId: "free",
  status: "active",
  currentPeriodStart: null,
  trialEndsAt: null,
  trialWarningSent: false,
  createdAt: "",
  updatedAt: "",
  plan: plans[0],
  usage: { sites: 0, users: 3 },
};

const listPlans = subscriptionService.listPlans as jest.Mock;
const getSubscription = subscriptionService.getSubscription as jest.Mock;
const changePlan = subscriptionService.changePlan as jest.Mock;

describe("BillingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listPlans.mockResolvedValue({ data: plans });
    getSubscription.mockResolvedValue({ data: currentSub });
    changePlan.mockResolvedValue({
      data: { ...currentSub, planId: "pro", plan: plans[1] },
    });
  });

  it("renders available plans including the current one", async () => {
    render(<BillingPage />);
    expect(await screen.findByText("Available Plans")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Professional")).toBeInTheDocument();
    });
    expect(screen.getByText(/current: free/i)).toBeInTheDocument();
  });

  it("does not offer the free trial plan once the company is on a paid plan", async () => {
    getSubscription.mockResolvedValue({
      data: { ...currentSub, planId: "pro", plan: plans[1] },
    });
    render(<BillingPage />);
    await waitFor(() => {
      expect(screen.getAllByText("Professional").length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/current: professional/i)).toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });

  it("requires confirmation before changing the plan", async () => {
    render(<BillingPage />);
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /choose plan/i }).length).toBeGreaterThan(0);
    });

    const chooseButtons = screen.getAllByRole("button", { name: /choose plan/i });
    const proButton = chooseButtons.find((btn) => !btn.hasAttribute("disabled"));

    expect(changePlan).not.toHaveBeenCalled();

    await userEvent.click(proButton!);

    await waitFor(() => {
      expect(screen.getByText("Confirm Your Subscription")).toBeInTheDocument();
    });

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("changes the plan only after confirmation with agreement", async () => {
    render(<BillingPage />);
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /choose plan/i }).length).toBeGreaterThan(0);
    });

    const chooseButtons = screen.getAllByRole("button", { name: /choose plan/i });
    const proButton = chooseButtons.find((btn) => !btn.hasAttribute("disabled"));
    await userEvent.click(proButton!);

    await waitFor(() => {
      expect(screen.getByText("Confirm Your Subscription")).toBeInTheDocument();
    });

    const confirm = screen.getByRole("button", { name: /confirm & upgrade/i });
    expect(confirm).toBeDisabled();

    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(confirm);

    await waitFor(() => expect(changePlan).toHaveBeenCalledWith("pro"));
  });

  it("does not change the plan without agreement", async () => {
    render(<BillingPage />);
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /choose plan/i }).length).toBeGreaterThan(0);
    });

    const chooseButtons = screen.getAllByRole("button", { name: /choose plan/i });
    const proButton = chooseButtons.find((btn) => !btn.hasAttribute("disabled"));
    await userEvent.click(proButton!);

    await waitFor(() => {
      expect(screen.getByText("Confirm Your Subscription")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /confirm & upgrade/i }));
    expect(changePlan).not.toHaveBeenCalled();
  });
});
