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
const mockUser = { role: "owner" };
const mockLogin = jest.fn().mockResolvedValue(mockUser);
const mockEmployeeLogin = jest.fn().mockResolvedValue(mockUser);

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  (useAuth as jest.Mock).mockReturnValue({ login: mockLogin, employeeLogin: mockEmployeeLogin });
});

describe("LoginPage", () => {
  it("renders form with email and password", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in as admin\/manager/i })).toBeInTheDocument();
  });

  it("renders Owner/Manager and Senior tabs", () => {
    render(<LoginPage />);
    expect(screen.getByText("Owner/Manager")).toBeInTheDocument();
    expect(screen.getByText("Senior")).toBeInTheDocument();
  });

  it("toggles between admin/manager and senior tabs", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: /sign in as admin\/manager/i })).toBeInTheDocument();

    await user.click(screen.getByText("Senior"));
    expect(screen.getByRole("button", { name: /sign in as senior/i })).toBeInTheDocument();

    await user.click(screen.getByText("Owner/Manager"));
    expect(screen.getByRole("button", { name: /sign in as admin\/manager/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /sign in as admin\/manager/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("calls login and redirects on success", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in as admin\/manager/i }));

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
    await user.click(screen.getByRole("button", { name: /sign in as admin\/manager/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("calls employeeLogin with email and password", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();

    await user.click(screen.getByText("Senior"));

    await user.type(screen.getByLabelText("Email"), "guard@example.com");
    await user.type(screen.getByLabelText("Password"), "emp123");
    await user.click(screen.getByRole("button", { name: /sign in as senior/i }));

    await waitFor(() => {
      expect(mockEmployeeLogin).toHaveBeenCalledWith({ email: "guard@example.com", password: "emp123" });
      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows forgot password link", () => {
    render(<LoginPage />);
    const link = screen.getByText("Forgot password?");
    expect(link.closest("a")).toHaveAttribute("href", "/forgot-password");
  });

  it("shows default placeholder for admin/manager tab", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("company@example.com")).toBeInTheDocument();
  });

  it("shows employee placeholder when senior tab selected", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Senior"));
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });
});
