import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle, CardContent } from ".";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Content</Card>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders with header, title, and content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("applies bordered variant", () => {
    render(<Card variant="bordered">Bordered</Card>);
    expect(screen.getByText("Bordered")).toHaveClass("border-border-light");
  });

  it("applies custom className", () => {
    render(<Card className="my-class">Custom</Card>);
    expect(screen.getByText("Custom")).toHaveClass("my-class");
  });

  it("forwards ref", () => {
    const ref = jest.fn();
    render(<Card ref={ref}>With ref</Card>);
    expect(ref).toHaveBeenCalled();
  });

  it("CardTitle renders as h3", () => {
    render(<CardTitle>Heading</CardTitle>);
    const heading = screen.getByText("Heading");
    expect(heading.tagName).toBe("H3");
  });
});
