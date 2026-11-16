import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompanyDetailPage from "./page";
import { adminCompanyService, subscriptionService } from "@/services";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/services", () => ({
  adminCompanyService: { getById: jest.fn(), changePlan: jest.fn() },
  subscriptionService: { listPlans: jest.fn() },
}));

const free = { id: "free", name: "Free", price: 0, userLimit: 0, reportLimit: 50 };
const starter = { id: "starter", name: "Starter", price: 65000, userLimit: 3, reportLimit: 25 };
const pro = { id: "pro", name: "Professional", price: 150000, userLimit: 10, reportLimit: 100 };

const company = {
  id: "c1",
  name: "Acme",
  email: "acme@example.com",
  subscription: { id: "s1", status: "active", trialEndsAt: null, plan: pro },
  users: [
    { id: "u1", name: "A", email: "a@x.com", role: "admin", status: "active" },
    { id: "u2", name: "B", email: "b@x.com", role: "senior", status: "active" },
    { id: "u3", name: "C", email: "c@x.com", role: "senior", status: "inactive" },
  ],
  invoices: [],
  _count: { incidents: 42 },
};

beforeEach(() => {
  jest.clearAllMocks();
  window.history.pushState({}, "", "/portal/companies/detail?id=c1");
  (adminCompanyService.getById as jest.Mock).mockResolvedValue({ data: company });
  (subscriptionService.listPlans as jest.Mock).mockResolvedValue({ data: [free, starter, pro] });
  (adminCompanyService.changePlan as jest.Mock).mockResolvedValue({ data: {} });
});

it("shows active users and reports against the plan limits", async () => {
  render(<CompanyDetailPage />);
  expect(await screen.findByText("2 / 10")).toBeInTheDocument();
  expect(screen.getByText("42 / 100")).toBeInTheDocument();
});

it("shows the 3-user trial cap for a company on the free trial", async () => {
  (adminCompanyService.getById as jest.Mock).mockResolvedValue({
    data: { ...company, subscription: { ...company.subscription, plan: free } },
  });
  render(<CompanyDetailPage />);
  expect(await screen.findByText("2 / 3")).toBeInTheDocument();
});

it("explains what the override does to over-limit companies", async () => {
  render(<CompanyDetailPage />);
  expect(
    await screen.findByText(/over the report limit locks the company out; over the user limit blocks new users/i),
  ).toBeInTheDocument();
});

it("lets the superadmin move the company to another paid plan", async () => {
  render(<CompanyDetailPage />);
  const select = await screen.findByLabelText("Change plan");
  expect(screen.queryByRole("option", { name: /^Free/ })).not.toBeInTheDocument();

  await userEvent.selectOptions(select, "starter");
  await userEvent.click(screen.getByRole("button", { name: "Change plan" }));

  await waitFor(() => expect(adminCompanyService.changePlan).toHaveBeenCalledWith("c1", "starter"));
  expect(adminCompanyService.getById).toHaveBeenCalledTimes(2);
});

it("shows the server's reason when the plan change fails", async () => {
  (adminCompanyService.changePlan as jest.Mock).mockRejectedValue(new Error("Subscription not found"));
  render(<CompanyDetailPage />);
  await userEvent.selectOptions(await screen.findByLabelText("Change plan"), "starter");
  await userEvent.click(screen.getByRole("button", { name: "Change plan" }));
  expect(await screen.findByText("Subscription not found")).toBeInTheDocument();
});
