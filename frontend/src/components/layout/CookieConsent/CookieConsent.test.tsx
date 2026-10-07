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

  it("hides the banner and stores consent after rejecting", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
    expect(localStorage.getItem("cookieConsent")).toBe("rejected");
  });

  it("clears posthog storage on reject", () => {
    localStorage.setItem("ph_test", "1");
    localStorage.setItem("_posthog_session", "2");
    localStorage.setItem("accessToken", "tok"); // should remain
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    expect(localStorage.getItem("cookieConsent")).toBe("rejected");
    expect(localStorage.getItem("ph_test")).toBeNull();
    expect(localStorage.getItem("_posthog_session")).toBeNull();
    expect(localStorage.getItem("accessToken")).toBe("tok");
  });
});
