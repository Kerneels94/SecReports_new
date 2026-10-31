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

  it("shows admin banner for non-admin users", () => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    render(<ProfilePage />);

    expect(
      screen.getByText(/Your profile details can only be updated by an admin/),
    ).toBeInTheDocument();
  });

  it("does not show admin banner for admin users", () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, role: "admin" },
    });
    render(<ProfilePage />);

    expect(
      screen.queryByText(/Your profile details can only be updated by an admin/),
    ).not.toBeInTheDocument();
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

  it("always shows the change password form", () => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    render(<ProfilePage />);

    expect(screen.getByText("Change Password")).toBeInTheDocument();
    expect(screen.getByText("Update Password")).toBeInTheDocument();
  });

  describe("password change", () => {
    it("validates new password length", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter current password"), "oldpass123");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "short");
      await userEvent.click(screen.getByText("Update Password"));

      expect(screen.getByText("New password must be at least 8 characters")).toBeInTheDocument();
    });

    it("validates passwords match", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter current password"), "oldpass123");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "newpassword123");
      await userEvent.type(screen.getByPlaceholderText("Re-enter new password"), "different");
      await userEvent.click(screen.getByText("Update Password"));

      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    it("calls changePassword on valid submission", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser, logout: jest.fn() });
      (authService.changePassword as jest.Mock).mockResolvedValue({});

      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter current password"), "oldpass123");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "newpassword123");
      await userEvent.type(screen.getByPlaceholderText("Re-enter new password"), "newpassword123");
      await userEvent.click(screen.getByText("Update Password"));

      await waitFor(() => {
        expect(authService.changePassword).toHaveBeenCalledWith("oldpass123", "newpassword123");
      });

      expect(screen.getByText("Password changed successfully")).toBeInTheDocument();
    });

    it("shows error on failed password change", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      (authService.changePassword as jest.Mock).mockRejectedValue(new Error("Failed to change password"));

      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter current password"), "oldpass123");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "newpassword123");
      await userEvent.type(screen.getByPlaceholderText("Re-enter new password"), "newpassword123");
      await userEvent.click(screen.getByText("Update Password"));

      await waitFor(() => {
        expect(screen.getByText("Failed to change password")).toBeInTheDocument();
      });
    });
  });
});

describe("ProfilePage name field and session", () => {
  it("does not offer the name field to users who cannot update users", () => {
    mockUseAuth.mockReturnValue({ user: { ...mockUser, permissions: ["incidents.view"] } });
    render(<ProfilePage />);

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.getByText("Update Password")).toBeInTheDocument();
  });

  it("offers the name field to users with users.update", () => {
    mockUseAuth.mockReturnValue({ user: { ...mockUser, role: "manager", permissions: ["users.update"] } });
    render(<ProfilePage />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("logs out after a successful password change, since the server ended every session", async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ user: mockUser, logout });
    (authService.changePassword as jest.Mock).mockResolvedValue({});
    render(<ProfilePage />);

    await userEvent.type(screen.getByPlaceholderText("Enter current password"), "oldpass123");
    await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "NewPassword1!");
    await userEvent.type(screen.getByPlaceholderText("Re-enter new password"), "NewPassword1!");
    await userEvent.click(screen.getByText("Update Password"));

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
    });
  });
});
