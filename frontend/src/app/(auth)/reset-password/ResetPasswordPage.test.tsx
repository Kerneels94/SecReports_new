import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import ResetPasswordPage from "./page";
import { authService } from "@/services";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("@/services", () => ({
  authService: { resetPassword: jest.fn() },
}));

const mockRouter = { push: jest.fn() };
const mockSearchParams = useSearchParams as jest.Mock;
const mockResetPassword = authService.resetPassword as jest.Mock;

function mockToken(token: string | null) {
  mockSearchParams.mockReturnValue({
    get: jest.fn().mockReturnValue(token),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
});

describe("ResetPasswordPage", () => {
  it('shows "no token" error when token is missing', () => {
    mockToken(null);
    render(<ResetPasswordPage />);

    expect(screen.getByText(/no token provided/i)).toBeInTheDocument();
    expect(screen.getByText(/request a new reset link/i)).toBeInTheDocument();
  });

  it("renders password form when token exists", () => {
    mockToken("valid-token");
    render(<ResetPasswordPage />);

    expect(screen.getByRole("heading", { name: /set new password/i })).toBeInTheDocument();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
  });

  it("validates password match", async () => {
    mockToken("valid-token");
    render(<ResetPasswordPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("New Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "different");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("validates min length", async () => {
    mockToken("valid-token");
    render(<ResetPasswordPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("New Password"), "short");
    await user.type(screen.getByLabelText("Confirm Password"), "short");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    });
  });

  it("calls reset and shows success", async () => {
    mockToken("valid-token");
    mockResetPassword.mockResolvedValue({ success: true, data: { message: "Reset" } });
    render(<ResetPasswordPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("New Password"), "newpassword123");
    await user.type(screen.getByLabelText("Confirm Password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("valid-token", "newpassword123");
      expect(screen.getByText(/password reset/i)).toBeInTheDocument();
      expect(screen.getByText(/reset successfully/i)).toBeInTheDocument();
    });
  });

  it("shows error on failure", async () => {
    mockToken("valid-token");
    mockResetPassword.mockRejectedValue(new Error("Token expired"));
    render(<ResetPasswordPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("New Password"), "newpassword123");
    await user.type(screen.getByLabelText("Confirm Password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText("Token expired")).toBeInTheDocument();
    });
  });

  it("shows sign in button on success", async () => {
    mockToken("valid-token");
    mockResetPassword.mockResolvedValue({ success: true, data: { message: "Reset" } });
    render(<ResetPasswordPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("New Password"), "newpassword123");
    await user.type(screen.getByLabelText("Confirm Password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Sign In"));
    expect(mockRouter.push).toHaveBeenCalledWith("/login");
  });

  it("shows loading state while resetting", async () => {
    mockToken("valid-token");
    mockResetPassword.mockImplementation(() => new Promise(() => {}));
    render(<ResetPasswordPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("New Password"), "newpassword123");
    await user.type(screen.getByLabelText("Confirm Password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(screen.getByText("Resetting...")).toBeInTheDocument();
  });
});
