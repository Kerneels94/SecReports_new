import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import RegisterPage from "./page";
import { authService } from "@/services";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/services", () => ({
  authService: {
    register: jest.fn(),
  },
}));

const mockRouter = { push: jest.fn() };
const mockRegister = authService.register as jest.Mock;

describe("RegisterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("renders the registration form with correct labels", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Company Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Company name is required")).toBeInTheDocument();
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
      expect(screen.getByText("Please confirm your password")).toBeInTheDocument();
    });
  });

  it("shows error when passwords do not match", async () => {
    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Company Name"), "Security Corp");
    await user.type(screen.getByLabelText("Your Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1!");
    await user.type(screen.getByLabelText("Confirm Password"), "Different1!");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("calls register and shows success message from API", async () => {
    mockRegister.mockResolvedValue({
      success: true,
      data: { message: "Account created. Please check your email to verify your account." },
    });
    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Company Name"), "Security Corp");
    await user.type(screen.getByLabelText("Your Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1!");
    await user.type(screen.getByLabelText("Confirm Password"), "Password1!");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        companyName: "Security Corp",
        name: "John Doe",
        email: "john@example.com",
        password: "Password1!",
      });
      expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
      expect(screen.getByText(/Account created\. Please check your email/i)).toBeInTheDocument();
    });
  });

  it("falls back to default success text when no message returned", async () => {
    mockRegister.mockResolvedValue({ success: true, data: {} });
    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Company Name"), "Security Corp");
    await user.type(screen.getByLabelText("Your Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "john@test.com");
    await user.type(screen.getByLabelText("Password"), "Password1!");
    await user.type(screen.getByLabelText("Confirm Password"), "Password1!");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Account created successfully")).toBeInTheDocument();
    });
  });

  it("displays server error on failure", async () => {
    mockRegister.mockRejectedValue(new Error("Email already taken"));
    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Company Name"), "Security Corp");
    await user.type(screen.getByLabelText("Your Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1!");
    await user.type(screen.getByLabelText("Confirm Password"), "Password1!");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already taken/i)).toBeInTheDocument();
    });
  });

  it("navigates to login page via link", () => {
    render(<RegisterPage />);
    const link = screen.getByRole("link", { name: /sign in/i });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("references the password policy on the privacy page", () => {
    render(<RegisterPage />);
    const link = screen.getByRole("link", { name: /password policy/i });
    expect(link).toHaveAttribute("href", "/privacy#password-policy");
  });

  it("calls register with fallback error message", async () => {
    mockRegister.mockRejectedValue("string error");
    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Company Name"), "Security Corp");
    await user.type(screen.getByLabelText("Your Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "err@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1!");
    await user.type(screen.getByLabelText("Confirm Password"), "Password1!");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });
});
