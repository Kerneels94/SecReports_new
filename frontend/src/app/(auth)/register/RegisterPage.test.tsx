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
    expect(screen.getByRole("heading", { name: /register your company/i })).toBeInTheDocument();
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
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "different");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("calls register and redirects on success", async () => {
    mockRegister.mockResolvedValue({ success: true, data: {} });
    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Company Name"), "Security Corp");
    await user.type(screen.getByLabelText("Your Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        companyName: "Security Corp",
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });
  });

  it("displays server error on failure", async () => {
    mockRegister.mockRejectedValue(new Error("Email already taken"));
    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Company Name"), "Security Corp");
    await user.type(screen.getByLabelText("Your Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
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

  it("calls register with fallback error message", async () => {
    mockRegister.mockRejectedValue("string error");
    render(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Company Name"), "Security Corp");
    await user.type(screen.getByLabelText("Your Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "err@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });
});
