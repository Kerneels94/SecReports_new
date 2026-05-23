import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import LoginPage from "./page";
import { useAuth } from "@/hooks/useAuth";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockRouter = { push: jest.fn() };
const mockLogin = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  (useAuth as jest.Mock).mockReturnValue({ login: mockLogin });
});

describe("LoginPage", () => {
  it("renders form with email and password", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in as company/i })).toBeInTheDocument();
  });

  it("renders Company/Employee tab toggle", () => {
    render(<LoginPage />);
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Employee")).toBeInTheDocument();
  });

  it("toggles between company and employee tabs", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: /sign in as company/i })).toBeInTheDocument();

    await user.click(screen.getByText("Employee"));
    expect(screen.getByRole("button", { name: /sign in as employee/i })).toBeInTheDocument();

    await user.click(screen.getByText("Company"));
    expect(screen.getByRole("button", { name: /sign in as company/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /sign in as company/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("calls login and redirects on success", async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in as company/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: "a@b.com", password: "password123" });
      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows error on failure", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));
    render(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in as company/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("shows forgot password link", () => {
    render(<LoginPage />);
    const link = screen.getByText("Forgot password?");
    expect(link.closest("a")).toHaveAttribute("href", "/forgot-password");
  });

  it("shows default placeholder for company tab", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("company@example.com")).toBeInTheDocument();
  });

  it("shows employee placeholder when employee tab selected", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Employee"));
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });
});
