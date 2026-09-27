import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionModal } from "./SubscriptionModal";
import { subscriptionService } from "@/services";

jest.mock("@/services", () => ({
  subscriptionService: {
    listPlans: jest.fn(),
    changePlan: jest.fn(),
  },
}));

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    userLimit: 0,
    trialPeriodDays: 14,
    features: "[]",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Professional",
    price: 150000,
    userLimit: 5,
    trialPeriodDays: null,
    features: "[\"15 sites\"]",
    highlighted: true,
  },
];

const mockListPlans = subscriptionService.listPlans as jest.Mock;
const mockChangePlan = subscriptionService.changePlan as jest.Mock;

describe("SubscriptionModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListPlans.mockResolvedValue({ data: plans });
    mockChangePlan.mockResolvedValue({ data: {} });
  });

  it("lists only paid plans (the free trial plan is not re-offered)", async () => {
    render(<SubscriptionModal open onClose={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Professional")).toBeInTheDocument();
    });
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });

  it("shows a confirmation after choosing a plan and confirms the change", async () => {
    const onPlanChanged = jest.fn();
    const onClose = jest.fn();
    render(
      <SubscriptionModal open onClose={onClose} onPlanChanged={onPlanChanged} />,
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /choose plan/i }).length).toBeGreaterThan(0);
    });

    await userEvent.click(screen.getAllByRole("button", { name: /choose plan/i })[0]);

    await waitFor(() => {
      expect(screen.getByText("R 1,500/mo")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /confirm & upgrade/i }));

    await waitFor(() => expect(mockChangePlan).toHaveBeenCalledWith("pro"));
    expect(onPlanChanged).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
