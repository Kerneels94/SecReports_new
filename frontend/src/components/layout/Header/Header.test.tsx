import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./index";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("Header", () => {
  it("renders nothing when user is null", () => {
    const { container } = render(<Header user={null} />);
    expect(container.querySelector("header")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("renders nothing when user is undefined", () => {
    const { container } = render(<Header />);
    expect(container.querySelector("header")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("displays user name and role when provided", () => {
    render(<Header user={{ name: "Alice", email: "alice@example.com", role: "admin" }} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("shows avatar initial (first letter of name uppercase)", () => {
    render(<Header user={{ name: "bob", email: "bob@example.com", role: "reporter" }} />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("opens dropdown on avatar click and shows profile link and logout", async () => {
    const onLogout = jest.fn();
    render(
      <Header
        user={{ name: "Charlie", email: "c@example.com", role: "manager" }}
        onLogout={onLogout}
      />,
    );

    await userEvent.click(screen.getByText("Charlie"));
    expect(screen.getByText("View Profile")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("calls onLogout when logout button is clicked in dropdown", async () => {
    const onLogout = jest.fn();
    render(
      <Header
        user={{ name: "Charlie", email: "c@example.com", role: "manager" }}
        onLogout={onLogout}
      />,
    );

    await userEvent.click(screen.getByText("Charlie"));
    await userEvent.click(screen.getByText("Logout"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("does not show dropdown initially", () => {
    render(<Header user={{ name: "Alice", email: "a@example.com", role: "admin" }} />);
    expect(screen.queryByText("View Profile")).not.toBeInTheDocument();
  });

  it("profile link points to /profile", async () => {
    render(
      <Header
        user={{ name: "Alice", email: "a@example.com", role: "admin" }}
        onLogout={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByText("Alice"));
    const link = screen.getByText("View Profile").closest("a");
    expect(link).toHaveAttribute("href", "/profile");
  });
});
