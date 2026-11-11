import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./index";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

const defaultPermissions = ["incidents.view", "incidents.create", "reports.view", "users.manage", "auditLogs.view", "billing.manage"];

let mockUser = { id: 1, role: "manager", name: "Manager", email: "manager@test.com", status: "active", companyId: 1, permissions: defaultPermissions };

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
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
  mockUser = { id: 1, role: "manager", name: "Manager", email: "manager@test.com", status: "active", companyId: 1, permissions: defaultPermissions };
});

function getNavLink(name: string): HTMLAnchorElement | null {
  const links = screen.getAllByRole("link");
  return (links.find((l) => l.textContent?.includes(name)) as HTMLAnchorElement) || null;
}

describe("Sidebar", () => {
  it("renders all 4 nav items", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);

    expect(getNavLink("Dashboard")).toHaveAttribute("href", "/dashboard");
    expect(getNavLink("Incidents")).toHaveAttribute("href", "/incidents");
    expect(getNavLink("Report incident")).toHaveAttribute("href", "/incidents/new");
    expect(getNavLink("Users")).toHaveAttribute("href", "/admin/users");
  });

  it("renders Report incident for admins with the create permission", () => {
    mockUser = { ...mockUser, role: "admin" };
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);

    expect(getNavLink("Report incident")).toHaveAttribute("href", "/incidents/new");
    expect(getNavLink("Incidents")).toHaveAttribute("href", "/incidents");
  });

  it("hides Report incident when the user cannot create incidents", () => {
    mockUser = { ...mockUser, permissions: ["incidents.view"] };
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);

    expect(getNavLink("Report incident")).toBeNull();
  });

  it("renders Report incident for seniors", () => {
    mockUser = { ...mockUser, role: "senior" };
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);

    expect(getNavLink("Report incident")).toHaveAttribute("href", "/incidents/new");
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
    expect(getNavLink("Report incident")).toHaveAttribute("href", "/incidents/new");
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

    const reportLink = getNavLink("Report incident");
    expect(reportLink).toHaveAttribute("href", "/incidents/new");
  });

  it("shows app title and system subtitle", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    expect(screen.getByText("SecReports")).toBeInTheDocument();
    expect(screen.getByText("Incident system")).toBeInTheDocument();
  });

  it("renders a view profile link in the sidebar footer", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    expect(getNavLink("View Profile")).toHaveAttribute("href", "/profile");
  });

  it("shows the footer billing card for admins", () => {
    mockUser = { ...mockUser, role: "admin" };
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    expect(getNavLink("View your plan and invoices")).toHaveAttribute("href", "/settings/billing");
  });

  it("hides the footer billing card from managers and seniors", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    expect(getNavLink("View your plan and invoices")).toBeNull();

    mockUser = { ...mockUser, role: "senior" };
    render(<Sidebar />);
    expect(getNavLink("View your plan and invoices")).toBeNull();
  });

  it("renders a logout button in the sidebar footer", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar onLogout={jest.fn()} />);
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("calls onLogout and onClose when logout is clicked", async () => {
    mockUsePathname.mockReturnValue("/dashboard");
    const onLogout = jest.fn();
    const onClose = jest.fn();
    render(<Sidebar onLogout={onLogout} onClose={onClose} />);

    const button = screen.getByRole("button", { name: /logout/i });
    button.click();

    expect(onLogout).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("moves focus into the drawer on open and back to the opener on close", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(<Sidebar isOpen={false} />);
    rerender(<Sidebar isOpen />);
    expect(screen.getByRole("button", { name: "Close sidebar" })).toHaveFocus();

    rerender(<Sidebar isOpen={false} />);
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("hides the closed drawer from the tab order on mobile only", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    const { container, rerender } = render(<Sidebar isOpen={false} />);
    const aside = container.querySelector("aside")!;
    expect(aside).toHaveClass("invisible", "lg:visible");

    rerender(<Sidebar isOpen />);
    expect(aside).not.toHaveClass("invisible");
  });
});
