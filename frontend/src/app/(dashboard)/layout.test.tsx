import { render, screen } from "@testing-library/react";
import DashboardLayout from "./layout";
import { useAuth } from "@/hooks/useAuth";

jest.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/dashboard",
}));
jest.mock("@/components/layout/Sidebar", () => ({ Sidebar: () => null }));
jest.mock("@/components/subscription/SubscriptionStatusGate", () => ({
  SubscriptionStatusGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseAuth = useAuth as jest.Mock;
const page = <DashboardLayout><p>Page content</p></DashboardLayout>;

it("renders the page while a stored session is being validated", () => {
  mockUseAuth.mockReturnValue({ user: null, isLoading: true, pendingSession: true });
  render(page);
  expect(screen.getByText("Page content")).toBeInTheDocument();
});

it("renders nothing while auth loads without a stored session", () => {
  mockUseAuth.mockReturnValue({ user: null, isLoading: true, pendingSession: false });
  render(page);
  expect(screen.queryByText("Page content")).not.toBeInTheDocument();
});

it("still blocks a signed-in user without the route's permission", () => {
  mockUseAuth.mockReturnValue({
    user: { id: "1", role: "senior", permissions: [] },
    isLoading: false,
    pendingSession: false,
  });
  render(page);
  expect(screen.getByText("No access")).toBeInTheDocument();
  expect(screen.queryByText("Page content")).not.toBeInTheDocument();
});
