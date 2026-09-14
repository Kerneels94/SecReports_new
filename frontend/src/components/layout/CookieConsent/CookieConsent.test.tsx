import { render, screen, fireEvent } from "@testing-library/react";
import CookieConsent from "./index";

describe("CookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the banner when no consent has been given", () => {
    render(<CookieConsent />);
    expect(screen.getByText(/we use cookies/i)).toBeInTheDocument();
  });

  it("hides the banner and stores consent after accepting", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: /accept/i }));
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
    expect(localStorage.getItem("cookieConsent")).toBe("accepted");
  });
});