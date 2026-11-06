import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminUsersPage from "./page";
import { userService, authService } from "@/services";
import { useAuth } from "@/hooks/useAuth";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services", () => ({
  userService: { create: jest.fn(), update: jest.fn(), remove: jest.fn() },
  authService: { listUsers: jest.fn() },
}));

jest.mock("@/components/ui/Modal", () => ({
  Modal: ({ open, onClose, title, children }: {
    open: boolean; onClose: () => void; title?: string; children: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button aria-label="Close" onClick={onClose}>×</button>
        {children}
      </div>
    ) : null,
}));

jest.mock("@/components/ui/Badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockCreate = userService.create as jest.Mock;
const mockUpdate = userService.update as jest.Mock;
const mockListUsers = authService.listUsers as jest.Mock;
const mockRemove = userService.remove as jest.Mock;

const adminUser = {
  id: 1,
  name: "Admin",
  email: "admin@example.com",
  role: "admin" as const,
  status: "active" as const,
  companyId: 1,
  permissions: ["users.manage", "users.update"],
};

const nonAdminUser = {
  id: 2,
  name: "Senior",
  email: "senior@example.com",
  role: "senior" as const,
  status: "active" as const,
  companyId: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockListUsers.mockResolvedValue({ data: [] });
});

describe("AdminUsersPage", () => {
  it("shows admin access required when user is not admin", () => {
    mockUseAuth.mockReturnValue({ user: nonAdminUser });
    render(<AdminUsersPage />);
    expect(screen.getByText("Admin access required.")).toBeInTheDocument();
    expect(screen.queryByText("Add an employee")).not.toBeInTheDocument();
  });

  it("shows admin access required when user is null", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<AdminUsersPage />);
    expect(screen.getByText("Admin access required.")).toBeInTheDocument();
  });

  it("renders form when user is admin", () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    render(<AdminUsersPage />);
    expect(screen.getByRole("heading", { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /add an employee/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Surname")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Temporary password")).toBeInTheDocument();
    expect(screen.getByLabelText("Role")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create user/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    render(<AdminUsersPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Invalid email")).toBeInTheDocument();
      expect(screen.getByText("Min 8 characters")).toBeInTheDocument();
    });
  });

  it("rejects a password the backend would reject, before sending it", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    render(<AdminUsersPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Temporary password"), "guardhouse1");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText("Must include an uppercase letter")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls userService.create and shows success", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    mockCreate.mockResolvedValue({ success: true, data: { message: "Verification email sent" } });
    render(<AdminUsersPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Name"), "Jane");
    await user.type(screen.getByLabelText("Surname"), "Doe");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Temporary password"), "Password1!");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        name: "Jane",
        surname: "Doe",
        email: "jane@example.com",
        password: "Password1!",
        role: "senior",
      });
      expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
    });
  });

  it("shows error on failure", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    mockCreate.mockRejectedValue(new Error("Email already exists"));
    render(<AdminUsersPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.type(screen.getByLabelText("Temporary password"), "Password1!");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });

  it("resets form after successful creation", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    mockCreate.mockResolvedValue({ success: true, data: { id: 1, message: "Verification email sent" } });
    render(<AdminUsersPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Temporary password"), "Password1!");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByLabelText<HTMLInputElement>("Name").value).toBe("");
    });
  });

  it("saves the surname when editing a user", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    mockListUsers.mockResolvedValue({
      data: [{ id: 2, name: "Jane", surname: "Doe", email: "jane@example.com", role: "senior", status: "active", createdAt: "" }],
    });
    mockUpdate.mockResolvedValue({ success: true, data: {} });
    render(<AdminUsersPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /edit jane doe/i }));
    const dialog = screen.getByRole("dialog");
    const surnameInput = within(dialog).getAllByRole("textbox")[1];
    await user.clear(surnameInput);
    await user.type(surnameInput, "Smith");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(2, expect.objectContaining({ surname: "Smith" }));
    });
  });

  it("removes a user after confirmation and refreshes the list", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    mockListUsers.mockResolvedValue({ data: [{ id: 2, name: "Senior", email: "senior@example.com", role: "senior", status: "active", createdAt: "" }] });
    mockRemove.mockResolvedValue({ success: true, data: { message: "User deleted successfully." } });
    render(<AdminUsersPage />);
    const user = userEvent.setup();

    const removeButton = await screen.findByRole("button", { name: /remove/i });
    await user.click(removeButton);

    await user.click(screen.getByRole("button", { name: /remove user/i }));

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith(2);
      expect(screen.getByText(/user senior removed/i)).toBeInTheDocument();
    });
  });
});
