import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./index";

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

  it("calls onLogout when logout button is clicked", async () => {
    const onLogout = jest.fn();
    render(
      <Header
        user={{ name: "Charlie", email: "c@example.com", role: "manager" }}
        onLogout={onLogout}
      />,
    );

    await userEvent.click(screen.getByText("Logout"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("does not render logout button when onLogout is not provided", () => {
    render(<Header user={{ name: "Alice", email: "a@example.com", role: "admin" }} />);
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });
});
