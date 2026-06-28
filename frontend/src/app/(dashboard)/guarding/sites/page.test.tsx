import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SitesPage from "./page";
import { guardingSiteService, guardService } from "@/services";
import type { GuardingSite, Guard } from "@/types";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("@/services", () => ({
  guardingSiteService: {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  guardService: {
    update: jest.fn(),
  },
}));

const mockList = guardingSiteService.list as jest.Mock;
const mockGetById = guardingSiteService.getById as jest.Mock;
const mockUpdate = guardingSiteService.update as jest.Mock;
const mockDelete = guardingSiteService.delete as jest.Mock;
const mockGuardUpdate = guardService.update as jest.Mock;

const mockSites: GuardingSite[] = [
  {
    id: "site-1",
    companyId: "company-1",
    name: "Riverside Park",
    address: "123 River Rd",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    _count: { guards: 2, patrolReports: 5, entryLogs: 10 },
  },
  {
    id: "site-2",
    companyId: "company-1",
    name: "Downtown Office",
    address: null,
    status: "active",
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    _count: { guards: 0, patrolReports: 0, entryLogs: 0 },
  },
];

  const mockGuards: Guard[] = [
    {
      id: "guard-1",
      companyId: "company-1",
      siteId: "site-1",
      name: "John",
      surname: "Doe",
      cellphone: "0712345678",
      employeeId: "EMP001",
      status: "active",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "guard-2",
      companyId: "company-1",
      siteId: "site-1",
      name: "Jane",
      surname: "Smith",
      cellphone: "0798765432",
      employeeId: "EMP002",
      status: "on_leave",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

const mockSiteWithGuards: GuardingSite = {
  ...mockSites[0],
  guards: mockGuards,
  _count: { guards: 2, patrolReports: 5, entryLogs: 10 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue({ data: mockSites });
});

describe("SitesPage", () => {
  it("shows loading spinner initially", () => {
    mockList.mockReturnValue(new Promise(() => {}));
    render(<SitesPage />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders site cards", async () => {
    render(<SitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Riverside Park")).toBeInTheDocument();
    });

    expect(screen.getByText("123 River Rd")).toBeInTheDocument();
    expect(screen.getByText("Downtown Office")).toBeInTheDocument();
    expect(screen.getByText("No address")).toBeInTheDocument();
  });

  it("shows empty state when no sites", async () => {
    mockList.mockResolvedValue({ data: [] });
    render(<SitesPage />);

    await waitFor(() => {
      expect(screen.getByText("No guarding sites yet. Create your first site.")).toBeInTheDocument();
    });
  });

  it("opens view modal with guard list", async () => {
    mockGetById.mockResolvedValue({ data: mockSiteWithGuards });
    render(<SitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByText("View")[0]);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("EMP001")).toBeInTheDocument();
      expect(screen.getByText("EMP002")).toBeInTheDocument();
    });
  });

  it("removes a guard from site via view modal", async () => {
    mockGetById.mockResolvedValue({ data: mockSiteWithGuards });
    mockGuardUpdate.mockResolvedValue({ data: mockGuards[0] });
    render(<SitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByText("View")[0]);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByText("Remove");
    await userEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockGuardUpdate).toHaveBeenCalledWith("guard-1", { siteId: null });
    });
  });

  it("opens edit modal with pre-filled data", async () => {
    render(<SitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByText("Edit")[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Riverside Park")).toBeInTheDocument();
      expect(screen.getByDisplayValue("123 River Rd")).toBeInTheDocument();
    });
  });

  it("edits site name and address", async () => {
    mockUpdate.mockResolvedValue({ data: {} });
    render(<SitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByText("Edit")[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Riverside Park")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Riverside Park");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Park");

    await userEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("site-1", {
        name: "Updated Park",
        address: "123 River Rd",
      });
    });
  });

  it("shows success message after editing", async () => {
    mockUpdate.mockResolvedValue({ data: {} });
    render(<SitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByText("Edit")[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(screen.getByText("Site updated successfully")).toBeInTheDocument();
    });
  });

  it("shows error on edit failure", async () => {
    mockUpdate.mockRejectedValue(new Error("Update failed"));
    render(<SitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByText("Edit")[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  it("cancels editing", async () => {
    render(<SitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByText("Edit")[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Riverside Park")).not.toBeInTheDocument();
    });
  });

  it("shows delete confirmation and deletes site", async () => {
    mockDelete.mockResolvedValue({});
    render(<SitesPage />);

    await waitFor(() => {
      expect(screen.getByText("Riverside Park")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByText("Delete")[0]);

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete this site/)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText("Delete");
    const confirmDeleteBtn = deleteButtons[deleteButtons.length - 1];
    await userEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("site-1");
      expect(screen.getByText("Site deleted successfully")).toBeInTheDocument();
    });
  });
});
