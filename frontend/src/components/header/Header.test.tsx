import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./Header";

jest.mock("next/link", () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

describe("Header", () => {
  it("desktop nav uses root-relative section anchors", () => {
    render(<Header />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/#features");
    expect(hrefs).toContain("/#pricing");
    expect(hrefs).not.toContain("#features");
    expect(hrefs).not.toContain("#pricing");
    expect(hrefs).not.toContain("/#Pricing");
  });

  it("mobile menu section links match the landing page ids", async () => {
    render(<Header />);
    await userEvent.click(screen.getByLabelText("Open menu"));
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/#features");
    expect(hrefs).toContain("/#pricing");
    expect(hrefs).not.toContain("/#Pricing");
  });
});
