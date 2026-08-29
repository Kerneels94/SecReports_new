import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./index";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("@/hooks/useDashboardMode", () => ({
  useDashboardMode: () => ({ mode: "incidents", setMode: jest.fn() }),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, role: "admin", name: "Admin", email: "admin@test.com", status: "active", companyId: 1 } }),
}));

jest.mock("next/link", () => {
  const MockLink = ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

const mockUsePathname = usePathname as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

function getNavLink(name: string): HTMLAnchorElement | null {
  const links = screen.getAllByRole("link");
  return (links.find((l) => l.textContent?.includes(name)) as HTMLAnchorElement) || null;
}

describe("Sidebar", () => {
  it("renders all 5 nav items", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);

    expect(getNavLink("Dashboard")).toHaveAttribute("href", "/dashboard");
    expect(getNavLink("Incidents")).toHaveAttribute("href", "/incidents");
    expect(getNavLink("Report Incident")).toHaveAttribute("href", "/incidents/new");
    expect(getNavLink("Reports")).toHaveAttribute("href", "/reports");
    expect(getNavLink("Users")).toHaveAttribute("href", "/admin/users");
  });

  it("highlights active link based on pathname", () => {
    mockUsePathname.mockReturnValue("/incidents");
    render(<Sidebar />);

    const incidentsLink = getNavLink("Incidents");
    expect(incidentsLink).toHaveClass("text-primary");

    const dashboardLink = getNavLink("Dashboard");
    expect(dashboardLink).not.toHaveClass("text-primary");
  });

  it("links have correct hrefs", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);

    expect(getNavLink("Dashboard")).toHaveAttribute("href", "/dashboard");
    expect(getNavLink("Incidents")).toHaveAttribute("href", "/incidents");
    expect(getNavLink("Report Incident")).toHaveAttribute("href", "/incidents/new");
    expect(getNavLink("Reports")).toHaveAttribute("href", "/reports");
    expect(getNavLink("Users")).toHaveAttribute("href", "/admin/users");
  });

  it("highlights parent route when on child detail path", () => {
    mockUsePathname.mockReturnValue("/incidents/123");
    render(<Sidebar />);

    const incidentsLink = getNavLink("Incidents");
    expect(incidentsLink).toHaveClass("text-primary");
  });

  it("does NOT highlight parent when on dedicated sub-route", () => {
    mockUsePathname.mockReturnValue("/incidents/new");
    render(<Sidebar />);

    const incidentsLink = getNavLink("Incidents");
    expect(incidentsLink).not.toHaveClass("text-primary");

    const reportLink = getNavLink("Report Incident");
    expect(reportLink).toHaveClass("text-primary");
  });

  it("shows app title and mode subtitle", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    expect(screen.getByText("SecReports")).toBeInTheDocument();
    expect(screen.getByText("Incident System")).toBeInTheDocument();
  });
});
