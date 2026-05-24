import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "./page";
import { authService } from "@/services";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services", () => ({
  authService: {
    me: jest.fn(),
    changePassword: jest.fn(),
  },
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

import { useAuth } from "@/hooks/useAuth";

const mockUseAuth = useAuth as jest.Mock;

const mockUser = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  role: "senior" as const,
  status: "active",
  companyId: 1,
  createdAt: "2026-01-15T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProfilePage", () => {
  it("renders user information", () => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    render(<ProfilePage />);

    expect(screen.getByText("My Profile")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("senior").length).toBe(2);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows owner banner for non-owner users", () => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    render(<ProfilePage />);

    expect(
      screen.getByText(/Your profile details can only be updated by an owner/),
    ).toBeInTheDocument();
  });

  it("does not show owner banner for owner users", () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, role: "owner" },
    });
    render(<ProfilePage />);

    expect(
      screen.queryByText(/Your profile details can only be updated by an owner/),
    ).not.toBeInTheDocument();
  });

  it("shows Edit Profile button for owner users", () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, role: "owner" },
    });
    render(<ProfilePage />);

    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
  });

  it("does not show Edit Profile button for non-owner users", () => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    render(<ProfilePage />);

    expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();
  });

  it("renders Change Password card", () => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    render(<ProfilePage />);

    expect(screen.getByText("Change Password")).toBeInTheDocument();
    expect(screen.getByText("Update Password")).toBeInTheDocument();
  });

  it("returns null when user is null", () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { container } = render(<ProfilePage />);
    expect(container.innerHTML).toBe("");
  });

  it("shows avatar initial", () => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    render(<ProfilePage />);

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  describe("password change", () => {
    it("validates current password required", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      render(<ProfilePage />);

      await userEvent.click(screen.getByText("Update Password"));

      expect(screen.getByText("Current password is required")).toBeInTheDocument();
    });

    it("validates new password length", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter your current password"), "oldpw");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "short");
      await userEvent.click(screen.getByText("Update Password"));

      expect(screen.getByText("New password must be at least 8 characters")).toBeInTheDocument();
    });

    it("validates passwords match", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter your current password"), "oldpw");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "newpassword123");
      await userEvent.type(screen.getByPlaceholderText("Re-enter new password"), "different");
      await userEvent.click(screen.getByText("Update Password"));

      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    it("calls changePassword on valid submission", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      (authService.changePassword as jest.Mock).mockResolvedValue({});

      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter your current password"), "oldpw");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "newpassword123");
      await userEvent.type(screen.getByPlaceholderText("Re-enter new password"), "newpassword123");
      await userEvent.click(screen.getByText("Update Password"));

      await waitFor(() => {
        expect(authService.changePassword).toHaveBeenCalledWith("oldpw", "newpassword123");
      });

      expect(screen.getByText("Password changed successfully")).toBeInTheDocument();
    });

    it("shows error on failed password change", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      (authService.changePassword as jest.Mock).mockRejectedValue(new Error("Current password is incorrect"));

      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter your current password"), "wrong");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "newpassword123");
      await userEvent.type(screen.getByPlaceholderText("Re-enter new password"), "newpassword123");
      await userEvent.click(screen.getByText("Update Password"));

      await waitFor(() => {
        expect(screen.getByText("Current password is incorrect")).toBeInTheDocument();
      });
    });
  });
});
