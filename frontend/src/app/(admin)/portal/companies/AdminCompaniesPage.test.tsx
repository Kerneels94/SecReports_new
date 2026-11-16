import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminCompaniesPage from "./page";
import { adminCompanyService } from "@/services";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/services", () => ({ adminCompanyService: { list: jest.fn() } }));
jest.mock("@/components/ui/Badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const DAY = 86_400_000;
const free = { id: "free", name: "Free", price: 0 };
const pro = { id: "pro", name: "Pro", price: 50000 };
const company = (id: string, name: string, plan: typeof free, trialEndsAt: string | null) => ({
  id,
  name,
  email: `${id}@example.com`,
  createdAt: "2026-01-01T00:00:00.000Z",
  _count: { users: 1, invoices: 0 },
  subscription: { id: `s-${id}`, status: "active", currentPeriodStart: null, trialEndsAt, plan },
});

beforeEach(() => {
  (adminCompanyService.list as jest.Mock).mockResolvedValue({
    data: [
      company("c1", "Trialing Co", free, new Date(Date.now() + 5 * DAY - 3_600_000).toISOString()),
      company("c2", "Expired Co", free, new Date(Date.now() - DAY).toISOString()),
      company("c3", "Paying Co", pro, null),
    ],
  });
});

describe("AdminCompaniesPage", () => {
  it("shows how long each trial has left", async () => {
    render(<AdminCompaniesPage />);

    expect(await screen.findByText("Trial · 5 days left")).toBeInTheDocument();
    expect(screen.getByText("Trial expired")).toBeInTheDocument();
  });

  it("filters to companies on trial", async () => {
    render(<AdminCompaniesPage />);
    await screen.findByText("Paying Co");

    await userEvent.click(screen.getByRole("button", { name: /^trial/i }));

    expect(screen.getByText("Trialing Co")).toBeInTheDocument();
    expect(screen.getByText("Expired Co")).toBeInTheDocument();
    expect(screen.queryByText("Paying Co")).not.toBeInTheDocument();
  });

  it("filters to paying companies", async () => {
    render(<AdminCompaniesPage />);
    await screen.findByText("Paying Co");

    await userEvent.click(screen.getByRole("button", { name: /^paid/i }));

    expect(screen.getByText("Paying Co")).toBeInTheDocument();
    expect(screen.queryByText("Trialing Co")).not.toBeInTheDocument();
  });
});
