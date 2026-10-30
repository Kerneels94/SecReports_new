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
    mockUser.role = "admin";
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

  it("shows the upgrade modal for an admin when the report limit is reached", async () => {
    getSubscription.mockResolvedValue({
      data: {
        planId: "pro",
        plan: {
          id: "pro",
          price: 150000,
          reportLimit: 100,
        },
        usage: { users: 3, reports: 200 },
      },
    });

    render(
      <SubscriptionStatusGate>
        <div>Dashboard content</div>
      </SubscriptionStatusGate>,
    );

    await waitFor(() => {
      expect(screen.getByText("Update Your Subscription")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/report limit/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("blocks a manager without logging out when the report limit is reached", async () => {
    mockUser.role = "manager";
    getSubscription.mockResolvedValue({
      data: {
        planId: "pro",
        plan: { id: "pro", price: 150000, reportLimit: 100 },
        usage: { users: 3, reports: 200 },
      },
    });

    render(
      <SubscriptionStatusGate>
        <div>Dashboard content</div>
      </SubscriptionStatusGate>,
    );

    await waitFor(() => {
      expect(screen.getByText("Report limit reached")).toBeInTheDocument();
    });
    expect(mockLogout).not.toHaveBeenCalled();
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("renders children when the report count is under the limit", async () => {
    getSubscription.mockResolvedValue({
      data: {
        planId: "pro",
        plan: { id: "pro", price: 150000, reportLimit: 100 },
        usage: { users: 3, reports: 99 },
      },
    });

    render(
      <SubscriptionStatusGate>
        <div>Dashboard content</div>
      </SubscriptionStatusGate>,
    );

    expect(await screen.findByText("Dashboard content")).toBeInTheDocument();
  });
});
