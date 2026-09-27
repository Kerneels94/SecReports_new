import { render, screen } from "@testing-library/react";
import HowToPage from "./page";

describe("HowToPage", () => {
  it("renders the page title and intro", () => {
    render(<HowToPage />);
    expect(
      screen.getByRole("heading", { name: /how to use secreports/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/step-by-step guide/i)).toBeInTheDocument();
  });

  it("renders the header and footer with the back-to-home navigation", () => {
    render(<HowToPage />);
    expect(screen.getAllByText("SecReports")).toHaveLength(2);
    expect(screen.getByText(/terms & conditions/i)).toBeInTheDocument();
  });

  it("renders each step section heading", () => {
    render(<HowToPage />);
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /understand the dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /report an incident/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /manage incidents/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /admin tools and billing/i })).toBeInTheDocument();
  });

  it("renders detailed step instructions", () => {
    render(<HowToPage />);
    expect(screen.getByText(/open the verification email/i)).toBeInTheDocument();
    expect(screen.getByText(/auto-generated reference number/i)).toBeInTheDocument();
    expect(screen.getByText(/Audit Logs records every change/i)).toBeInTheDocument();
  });

  it("renders image placeholder slots for each step", () => {
    render(<HowToPage />);
    expect(screen.getAllByLabelText(/screenshot placeholder/i)).toHaveLength(6);
  });
});