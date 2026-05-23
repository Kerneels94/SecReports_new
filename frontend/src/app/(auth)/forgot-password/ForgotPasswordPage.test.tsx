import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import ForgotPasswordPage from "./page";
import { authService } from "@/services";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/services", () => ({
  authService: { forgotPassword: jest.fn() },
}));

const mockRouter = { push: jest.fn() };
const mockForgotPassword = authService.forgotPassword as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
});

describe("ForgotPasswordPage", () => {
  it("renders email form", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("shows success message on submit", async () => {
    mockForgotPassword.mockResolvedValue({ success: true, data: { message: "Sent" } });
    render(<ForgotPasswordPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByText(/reset link has been sent/i)).toBeInTheDocument();
    });
  });

  it("shows error on failure", async () => {
    mockForgotPassword.mockRejectedValue(new Error("User not found"));
    render(<ForgotPasswordPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "unknown@b.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText("User not found")).toBeInTheDocument();
    });
  });

  it("has back to sign in links", () => {
    render(<ForgotPasswordPage />);
    const backLinks = screen.getAllByText("Back to sign in");
    expect(backLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("calls forgotPassword with email", async () => {
    mockForgotPassword.mockResolvedValue({ success: true, data: {} });
    render(<ForgotPasswordPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("shows sending state", async () => {
    mockForgotPassword.mockImplementation(() => new Promise(() => {}));
    render(<ForgotPasswordPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(screen.getByText("Sending...")).toBeInTheDocument();
  });
});
