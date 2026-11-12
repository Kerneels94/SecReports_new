import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "./page";
import { authService, userService } from "@/services";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services", () => ({
  authService: {
    me: jest.fn(),
    changePassword: jest.fn(),
    deleteCompany: jest.fn(),
  },
  userService: { update: jest.fn() },
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

    expect(screen.getByText("My profile")).toBeInTheDocument();
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

    expect(screen.getByText("Change password")).toBeInTheDocument();
    expect(screen.getByText("Update password")).toBeInTheDocument();
  });

  it("marks password rules as met while typing", async () => {
    mockUseAuth.mockReturnValue({ user: mockUser });
    render(<ProfilePage />);

    await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "NewPassword1!");

    expect(screen.getByText("8+ characters").closest("li")).toHaveClass("text-primary");
    expect(screen.getByText("Number").closest("li")).toHaveClass("text-primary");
    expect(screen.getByText("Special character").closest("li")).toHaveClass("text-primary");
  });

  describe("password change", () => {
    it("validates new password length", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter current password"), "oldpass123");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "short");
      await userEvent.click(screen.getByText("Update password"));

      expect(screen.getByText("New password must be at least 8 characters")).toBeInTheDocument();
    });

    it("validates passwords match", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser });
      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter current password"), "oldpass123");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "newpassword123");
      await userEvent.type(screen.getByPlaceholderText("Re-enter new password"), "different");
      await userEvent.click(screen.getByText("Update password"));

      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    it("calls changePassword on valid submission", async () => {
      mockUseAuth.mockReturnValue({ user: mockUser, logout: jest.fn() });
      (authService.changePassword as jest.Mock).mockResolvedValue({});

      render(<ProfilePage />);

      await userEvent.type(screen.getByPlaceholderText("Enter current password"), "oldpass123");
      await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "newpassword123");
      await userEvent.type(screen.getByPlaceholderText("Re-enter new password"), "newpassword123");
      await userEvent.click(screen.getByText("Update password"));

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
      await userEvent.click(screen.getByText("Update password"));

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
    expect(screen.queryByRole("button", { name: "Save name" })).not.toBeInTheDocument();
    expect(screen.getByText("Update password")).toBeInTheDocument();
  });

  it("offers the name field to users with users.update", () => {
    mockUseAuth.mockReturnValue({ user: { ...mockUser, role: "manager", permissions: ["users.update"] } });
    render(<ProfilePage />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Surname")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save name" })).toBeInTheDocument();
  });

  it("sends an empty surname when it is cleared", async () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, surname: "Doe", role: "manager", permissions: ["users.update"] },
      refreshUser: jest.fn(),
    });
    (userService.update as jest.Mock).mockResolvedValue({ data: {} });
    render(<ProfilePage />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Surname"));
    await user.click(screen.getByRole("button", { name: "Save name" }));

    await waitFor(() => {
      expect(userService.update).toHaveBeenCalledWith(1, expect.objectContaining({ surname: "" }));
    });
  });

  it("logs out after a successful password change, since the server ended every session", async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ user: mockUser, logout });
    (authService.changePassword as jest.Mock).mockResolvedValue({});
    render(<ProfilePage />);

    await userEvent.type(screen.getByPlaceholderText("Enter current password"), "oldpass123");
    await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "NewPassword1!");
    await userEvent.type(screen.getByPlaceholderText("Re-enter new password"), "NewPassword1!");
    await userEvent.click(screen.getByText("Update password"));

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
    });
  });

  it("hides company deletion from non-admins", () => {
    mockUseAuth.mockReturnValue({ user: { ...mockUser, role: "manager" } });
    render(<ProfilePage />);

    expect(screen.queryByText("Delete company account")).not.toBeInTheDocument();
  });

  it("lets an admin delete the company after typing DELETE and their password, then logs out", async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ user: { ...mockUser, role: "admin" }, logout });
    (authService.deleteCompany as jest.Mock).mockResolvedValue({});
    render(<ProfilePage />);

    await userEvent.click(screen.getByRole("button", { name: "Delete company account" }));
    const confirm = screen.getByRole("button", { name: "Permanently delete" });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Type "DELETE" to confirm'), "DELETE");
    await userEvent.type(screen.getByLabelText("Your password"), "secret");
    await userEvent.click(confirm);

    await waitFor(() => {
      expect(authService.deleteCompany).toHaveBeenCalledWith("secret");
      expect(logout).toHaveBeenCalledTimes(1);
    });
  });
});
