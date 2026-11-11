import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PermissionsPage from "./page";
import { permissionsService } from "@/services";
import { useAuth } from "@/hooks/useAuth";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services", () => ({
  permissionsService: { get: jest.fn(), update: jest.fn() },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockGet = permissionsService.get as jest.Mock;
const mockUpdate = permissionsService.update as jest.Mock;

const adminUser = {
  id: 1,
  name: "Admin",
  email: "admin@example.com",
  role: "admin" as const,
  status: "active" as const,
  companyId: 1,
};

const nonAdminUser = {
  id: 2,
  name: "Senior",
  email: "senior@example.com",
  role: "senior" as const,
  status: "active" as const,
  companyId: 1,
};

const matrix = {
  roles: ["admin", "manager", "senior"],
  permissions: [
    { key: "users.manage", label: "Manage users", description: "Create, list, and remove employee accounts", roles: ["admin"], defaults: ["admin"] },
    { key: "auditLogs.view", label: "View audit logs", description: "See activity and change tracking logs", roles: ["admin", "manager"], defaults: ["admin", "manager"] },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: matrix });
});

describe("PermissionsPage", () => {
  it("shows admin access required when user is not admin", () => {
    mockUseAuth.mockReturnValue({ user: nonAdminUser });
    render(<PermissionsPage />);
    expect(screen.getByText("Admin access required.")).toBeInTheDocument();
    expect(screen.queryByText("Permissions")).not.toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("renders the matrix with toggles for each role", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    render(<PermissionsPage />);

    expect(await screen.findByRole("heading", { name: /permissions/i })).toBeInTheDocument();
    expect(await screen.findByText("Manage users")).toBeInTheDocument();
    expect(await screen.findByRole("switch", { name: /view audit logs: senior/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /manage users: senior/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: /manage users: admin/i })).toHaveAttribute("aria-checked", "true");
  });

  it("locks the admin toggle on permissions admin gets by default", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    render(<PermissionsPage />);

    expect(
      await screen.findByRole("switch", { name: /manage users: admin/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("switch", { name: /view audit logs: manager/i }),
    ).not.toBeDisabled();
  });

  it("saves a toggled permission via permissionsService.update", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    render(<PermissionsPage />);

    const seniorSwitch = await screen.findByRole("switch", { name: /view audit logs: senior/i });
    expect(seniorSwitch).toHaveAttribute("aria-checked", "false");
    await userEvent.click(seniorSwitch);
    expect(seniorSwitch).toHaveAttribute("aria-checked", "true");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { key: "auditLogs.view", roles: ["admin", "manager", "senior"] },
          { key: "users.manage", roles: ["admin"] },
        ]),
      );
    });
  });

  it("restores the last saved matrix on Reset without crashing", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    render(<PermissionsPage />);

    const seniorSwitch = await screen.findByRole("switch", { name: /view audit logs: senior/i });
    await userEvent.click(seniorSwitch);
    expect(seniorSwitch).toHaveAttribute("aria-checked", "true");

    await userEvent.click(screen.getByRole("button", { name: /reset permissions/i }));

    expect(seniorSwitch).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByRole("switch", { name: /manage users: admin/i }),
    ).toBeDisabled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("resets to the saved response after a successful save, not the initial load", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser, refreshUser: jest.fn() });
    // The backend returns the new baseline: senior now has auditLogs.view.
    mockUpdate.mockResolvedValue({
      data: {
        ...matrix,
        permissions: matrix.permissions.map((p) =>
          p.key === "auditLogs.view" ? { ...p, roles: ["admin", "manager", "senior"] } : p,
        ),
      },
    });
    render(<PermissionsPage />);

    const seniorSwitch = await screen.findByRole("switch", { name: /view audit logs: senior/i });
    await userEvent.click(seniorSwitch);
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText("Permissions saved");

    // Edit again, then Reset: it must go back to what was saved (senior on).
    const managerSwitch = screen.getByRole("switch", { name: /view audit logs: manager/i });
    await userEvent.click(managerSwitch);
    expect(managerSwitch).toHaveAttribute("aria-checked", "false");
    await userEvent.click(screen.getByRole("button", { name: /reset permissions/i }));

    expect(managerSwitch).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("switch", { name: /view audit logs: senior/i }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("disables Save until a change has been made", async () => {
    mockUseAuth.mockReturnValue({ user: adminUser });
    render(<PermissionsPage />);

    const saveButton = await screen.findByRole("button", { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });
});