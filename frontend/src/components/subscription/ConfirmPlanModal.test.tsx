import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmPlanModal } from "./ConfirmPlanModal";
import type { SubscriptionPlan } from "@/types";

const plan: SubscriptionPlan = {
  id: "pro",
  name: "Professional",
  price: 150000,
  siteLimit: 15,
  userLimit: 5,
  trialPeriodDays: null,
  features: "[\"15 sites\",\"5 users\"]",
  highlighted: true,
};

describe("ConfirmPlanModal", () => {
  it("shows the selected plan and price", () => {
    render(
      <ConfirmPlanModal plan={plan} open onClose={jest.fn()} onConfirm={jest.fn()} />,
    );
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("R 1,500/mo")).toBeInTheDocument();
  });

  it("shows billing start on the 25th and mentions monthly payment plan", () => {
    render(
      <ConfirmPlanModal plan={plan} open onClose={jest.fn()} onConfirm={jest.fn()} />,
    );
    expect(screen.getByText(/your first payment of r 1,500 is due then/i)).toBeInTheDocument();
    expect(screen.getByText(/recurring on the 25th of each month/i)).toBeInTheDocument();
    expect(screen.getAllByText(/monthly payment plan/i).length).toBeGreaterThan(0);
  });

  it("disables the confirm button until the agreement is checked", async () => {
    render(
      <ConfirmPlanModal plan={plan} open onClose={jest.fn()} onConfirm={jest.fn()} />,
    );
    const confirm = screen.getByRole("button", { name: /confirm & upgrade/i });
    expect(confirm).toBeDisabled();

    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);
    expect(confirm).toBeEnabled();
  });

  it("calls onConfirm with the plan id when confirmed", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ConfirmPlanModal plan={plan} open onClose={jest.fn()} onConfirm={onConfirm} />,
    );

    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /confirm & upgrade/i }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("pro"));
  });

  it("does not call onConfirm without agreement", async () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmPlanModal plan={plan} open onClose={jest.fn()} onConfirm={onConfirm} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /confirm & upgrade/i }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
