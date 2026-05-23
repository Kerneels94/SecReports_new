import { render, screen } from "@testing-library/react";
import { Badge } from ".";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Open</Badge>);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    const { rerender } = render(<Badge variant="success">Resolved</Badge>);
    expect(screen.getByText("Resolved")).toHaveClass("bg-green-900/40");

    rerender(<Badge variant="danger">Critical</Badge>);
    expect(screen.getByText("Critical")).toHaveClass("bg-red-900/40");

    rerender(<Badge variant="warning">Pending</Badge>);
    expect(screen.getByText("Pending")).toHaveClass("bg-yellow-900/40");

    rerender(<Badge variant="info">Info</Badge>);
    expect(screen.getByText("Info")).toHaveClass("bg-blue-900/40");

    rerender(<Badge variant="default">Default</Badge>);
    expect(screen.getByText("Default")).toHaveClass("bg-slate-700");
  });

  it("applies custom className", () => {
    render(<Badge className="my-badge">Custom</Badge>);
    expect(screen.getByText("Custom")).toHaveClass("my-badge");
  });
});
