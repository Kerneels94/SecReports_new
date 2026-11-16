import { render, screen } from "@testing-library/react";
import LandingPage from "./page";

jest.mock("@/services", () => ({
  contactService: { send: jest.fn() },
}));

describe("LandingPage", () => {
  it("renders the incident-reporting hero", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /every incident on record/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/one place to log call-outs/i)).toBeInTheDocument();
  });

  it("renders the reporting-focused features heading", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        name: /everything you need to report, track and prove/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders a How it works section linking to the full guide", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { name: /from call-out to client report/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Log the incident")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /read the full guide/i }),
    ).toHaveAttribute("href", "/how-to");
  });

  it("lists every paid package with its price and limits", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: "Starter" })).toBeInTheDocument();
    expect(screen.getByText("R 650")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Standard" })).toBeInTheDocument();
    expect(screen.getByText("R 850")).toBeInTheDocument();
    expect(screen.getByText("25 incident reports")).toBeInTheDocument();
    expect(screen.getByText("Up to 10 users")).toBeInTheDocument();
    expect(screen.getByText("Up to 5 user accounts")).toBeInTheDocument();
    expect(screen.getByText("Up to 8 user accounts")).toBeInTheDocument();
  });

  it("puts the pricing cards in a labelled, keyboard-scrollable region", () => {
    render(<LandingPage />);
    const region = screen.getByRole("region", { name: "Pricing plans" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.querySelectorAll(".price-card")).toHaveLength(5);
  });

  it("states the trial limits as 3 users and 10 reports everywhere", () => {
    render(<LandingPage />);
    expect(screen.getByText(/up to 3 users and 10 incident reports on the trial/i)).toBeInTheDocument();
    expect(screen.getByText(/with a 3-user and 10-report\s+limit during your trial/i)).toBeInTheDocument();
    expect(screen.getByText("10 incident reports")).toBeInTheDocument();
    expect(screen.getByText(/users and 10 incident reports, with no credit card required/i)).toBeInTheDocument();
    expect(screen.queryByText(/50-report/i)).not.toBeInTheDocument();
  });

  it("does not reference guarding operations or multi-site management", () => {
    render(<LandingPage />);
    expect(screen.queryByText(/security professionals/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/multiple sites and clients/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/large security operations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/growing security teams/i)).not.toBeInTheDocument();
  });
});
