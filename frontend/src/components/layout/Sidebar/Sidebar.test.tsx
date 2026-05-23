import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./index";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
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

describe("Sidebar", () => {
  it("renders all 5 nav items", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Incidents")).toBeInTheDocument();
    expect(screen.getByText("Report Incident")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("highlights active link based on pathname", () => {
    mockUsePathname.mockReturnValue("/incidents");
    render(<Sidebar />);

    const incidentsLink = screen.getByText("Incidents").closest("a");
    expect(incidentsLink).toHaveClass("text-primary");

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).not.toHaveClass("text-primary");
  });

  it("links have correct hrefs", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);

    expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText("Incidents").closest("a")).toHaveAttribute("href", "/incidents");
    expect(screen.getByText("Report Incident").closest("a")).toHaveAttribute("href", "/incidents/new");
    expect(screen.getByText("Reports").closest("a")).toHaveAttribute("href", "/reports");
    expect(screen.getByText("Users").closest("a")).toHaveAttribute("href", "/admin/users");
  });

  it("highlights parent route when on child detail path", () => {
    mockUsePathname.mockReturnValue("/incidents/123");
    render(<Sidebar />);

    const incidentsLink = screen.getByText("Incidents").closest("a");
    expect(incidentsLink).toHaveClass("text-primary");
  });

  it("does NOT highlight parent when on dedicated sub-route", () => {
    mockUsePathname.mockReturnValue("/incidents/new");
    render(<Sidebar />);

    const incidentsLink = screen.getByText("Incidents").closest("a");
    expect(incidentsLink).not.toHaveClass("text-primary");

    const reportLink = screen.getByText("Report Incident").closest("a");
    expect(reportLink).toHaveClass("text-primary");
  });

  it("shows app title", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<Sidebar />);
    expect(screen.getByText("SecReports")).toBeInTheDocument();
  });
});
