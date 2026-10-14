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
        name: /every incident, captured and searchable/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/focused incident reporting platform/i)).toBeInTheDocument();
  });

  it("renders the reporting-focused features heading", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        name: /everything you need to report and track incidents/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders a How it works section linking to the full guide", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { name: /how it works/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1. Log the incident")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /see the full guide/i }),
    ).toHaveAttribute("href", "/how-to");
  });

  it("does not reference guarding operations or multi-site management", () => {
    render(<LandingPage />);
    expect(screen.queryByText(/security professionals/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/multiple sites and clients/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/large security operations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/growing security teams/i)).not.toBeInTheDocument();
  });
});
