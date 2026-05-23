import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from ".";

describe("Input", () => {
  it("renders with label", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<Input label="Email" error="Email is required" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Email is required");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("sets aria-describedby when error is present", () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-describedby", "email-error");
  });

  it("calls onChange when typing", async () => {
    const onChange = jest.fn();
    render(<Input label="Name" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Name"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("respects disabled state", () => {
    render(<Input label="Name" disabled />);
    expect(screen.getByLabelText("Name")).toBeDisabled();
  });

  it("renders without label", () => {
    const { container } = render(<Input placeholder="no label" />);
    expect(container.querySelector("input")).toBeInTheDocument();
  });

  it("forwards type attribute", () => {
    render(<Input label="Pin" type="password" />);
    expect(screen.getByLabelText("Pin")).toHaveAttribute("type", "password");
  });

  it("generates id from label", () => {
    render(<Input label="Full Name" />);
    expect(screen.getByLabelText("Full Name")).toHaveAttribute("id", "full-name");
  });

  it("accepts custom id", () => {
    render(<Input label="Name" id="custom-id" />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("id", "custom-id");
  });

  it("renders placeholder text", () => {
    render(<Input label="Email" placeholder="you@example.com" />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });
});
