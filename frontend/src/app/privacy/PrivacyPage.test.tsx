import { render, screen } from "@testing-library/react";
import PrivacyPage from "./page";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("PrivacyPage", () => {
  it("renders the password policy section", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { name: /password policy/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("At least one lowercase letter")).toBeInTheDocument();
    expect(screen.getByText("At least one uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("At least one digit")).toBeInTheDocument();
    expect(screen.getByText("At least one special character")).toBeInTheDocument();
  });
});