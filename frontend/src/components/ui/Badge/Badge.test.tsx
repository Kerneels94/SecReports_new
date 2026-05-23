import { render, screen } from "@testing-library/react";
import { Badge } from ".";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Open</Badge>);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    const { rerender } = render(<Badge variant="success">Resolved</Badge>);
    expect(screen.getByText("Resolved")).toHaveClass("bg-green-100");

    rerender(<Badge variant="danger">Critical</Badge>);
    expect(screen.getByText("Critical")).toHaveClass("bg-red-100");
  });
});
