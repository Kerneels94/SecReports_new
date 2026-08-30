import { render, screen, waitFor } from "@testing-library/react";
import { SubscriptionStatusGate } from "./SubscriptionStatusGate";
import { subscriptionService } from "@/services";

jest.mock("@/services", () => ({
  subscriptionService: {
    getSubscription: jest.fn(),
    listPlans: jest.fn(),
    changePlan: jest.fn(),
  },
}));

const mockUser = { id: "1", role: "admin", companyId: "c1", name: "Admin", email: "a@b.com", status: "active" };
const mockLogout = jest.fn();

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

const getSubscription = subscriptionService.getSubscription as jest.Mock;
const listPlans = subscriptionService.listPlans as jest.Mock;

function pastDate(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

function futureDate(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

describe("SubscriptionStatusGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listPlans.mockResolvedValue({ data: [] });
  });

  it("renders children when the subscription is active", async () => {
    getSubscription.mockResolvedValue({
      data: { plan: { price: 0 }, trialEndsAt: futureDate(5) },
    });

    render(
      <SubscriptionStatusGate>
        <div>Dashboard content</div>
      </SubscriptionStatusGate>,
    );

    expect(await screen.findByText("Dashboard content")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the subscription modal for an admin with an expired trial", async () => {
    getSubscription.mockResolvedValue({
      data: { plan: { price: 0 }, trialEndsAt: pastDate(1) },
    });

    render(
      <SubscriptionStatusGate>
        <div>Dashboard content</div>
      </SubscriptionStatusGate>,
    );

    await waitFor(() => {
      expect(screen.getByText("Update Your Subscription")).toBeInTheDocument();
    });
  });

  it("blocks and logs out a manager with an expired trial", async () => {
    mockUser.role = "manager";
    getSubscription.mockResolvedValue({
      data: { plan: { price: 0 }, trialEndsAt: pastDate(1) },
    });

    render(
      <SubscriptionStatusGate>
        <div>Dashboard content</div>
      </SubscriptionStatusGate>,
    );

    await waitFor(() => {
      expect(screen.getByText(/trial has ended/i)).toBeInTheDocument();
    });
    expect(mockLogout).toHaveBeenCalled();
  });
});
