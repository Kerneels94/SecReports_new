import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanSelectCard } from "./PlanSelectCard";
import type { SubscriptionPlan } from "@/types";

const plan: SubscriptionPlan = {
  id: "pro",
  name: "Professional",
  price: 150000,
  userLimit: 5,
  reportLimit: 100,
  trialPeriodDays: null,
  features: "[\"5 users\"]",
  highlighted: true,
};

describe("PlanSelectCard", () => {
  it("renders plan name, price, and landing page features", () => {
    render(<PlanSelectCard plan={plan} isCurrent={false} onSelect={jest.fn()} />);
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("For growing teams that need more seats.")).toBeInTheDocument();
    expect(screen.getByText("Up to 5 users")).toBeInTheDocument();
    expect(screen.getByText("R 1,500")).toBeInTheDocument();
    expect(screen.getByText("CSV & PDF export")).toBeInTheDocument();
    expect(screen.getByText("Priority support")).toBeInTheDocument();
  });

  it("renders Current Plan and disables the button when current", () => {
    render(<PlanSelectCard plan={plan} isCurrent onSelect={jest.fn()} />);
    const button = screen.getByRole("button", { name: /current plan/i });
    expect(button).toBeDisabled();
  });

  it("calls onSelect when the choose plan button is clicked", async () => {
    const onSelect = jest.fn();
    render(<PlanSelectCard plan={plan} isCurrent={false} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /choose plan/i }));
    expect(onSelect).toHaveBeenCalled();
  });
});
