import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./useAuth";
import { authService } from "@/services";

jest.mock("@/services", () => ({
  authService: {
    me: jest.fn(),
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    refreshSession: jest.fn(),
  },
}));

const mockMe = authService.me as jest.Mock;
const mockLogin = authService.login as jest.Mock;
const mockLogout = authService.logout as jest.Mock;
const mockRefreshSession = authService.refreshSession as jest.Mock;

function TestComponent() {
  const { user, isLoading, login, logout } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <span data-testid="user">{user ? user.name : "null"}</span>
      <button onClick={() => login({ email: "a@b.com", password: "pw" })}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockRefreshSession.mockResolvedValue({ accessToken: "new-token", user: {} });
});

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => render(<TestComponent />)).toThrow("useAuth must be used within AuthProvider");
  });

  it("shows loading state initially when token exists", () => {
    localStorage.setItem("accessToken", "tok");
    mockMe.mockReturnValue(new Promise(() => {}));
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("does not show loading when no token", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("null");
    });
  });

  it("fetches user on mount if token exists", async () => {
    localStorage.setItem("accessToken", "tok");
    mockMe.mockResolvedValue({ data: { id: 1, name: "Alice", email: "a@b.com", role: "admin", status: "active", companyId: 1 } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Alice");
    });
  });

  it("removes token if me() fails", async () => {
    localStorage.setItem("accessToken", "bad-token");
    mockMe.mockRejectedValue(new Error("Unauthorized"));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(localStorage.getItem("accessToken")).toBeNull();
      expect(screen.getByTestId("user")).toHaveTextContent("null");
    });
  });

  it("logs out when the refresh session was revoked elsewhere", async () => {
    localStorage.setItem("accessToken", "tok");
    mockRefreshSession.mockResolvedValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(localStorage.getItem("accessToken")).toBeNull();
      expect(screen.getByTestId("user")).toHaveTextContent("null");
    });
    expect(mockMe).not.toHaveBeenCalled();
  });

  it("login stores access token and sets user", async () => {
    const userData = { id: 1, name: "Bob", email: "b@b.com", role: "senior", status: "active", companyId: 1 };
    mockLogin.mockResolvedValue({
      data: {
        accessToken: "at",
        refreshToken: "rt",
        user: userData,
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));

    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(localStorage.getItem("accessToken")).toBe("at");
      expect(localStorage.getItem("refreshToken")).toBeNull();
      expect(screen.getByTestId("user")).toHaveTextContent("Bob");
    });
  });

  it("logout calls backend and clears access token", async () => {
    localStorage.setItem("accessToken", "at");
    mockMe.mockResolvedValue({ data: { id: 1, name: "Charlie", email: "c@c.com", role: "manager", status: "active", companyId: 1 } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Charlie"));

    await userEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledWith();
      expect(localStorage.getItem("accessToken")).toBeNull();
      expect(localStorage.getItem("refreshToken")).toBeNull();
      expect(screen.getByTestId("user")).toHaveTextContent("null");
    });
  });
});

describe("useAuth session expiry", () => {
  it("clears the user when the API reports the session has ended", async () => {
    localStorage.setItem("accessToken", "tok");
    mockMe.mockResolvedValue({ data: { id: 1, name: "Alice", email: "a@b.com", role: "admin", status: "active", companyId: 1 } });
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Alice");
    });

    act(() => {
      window.dispatchEvent(new Event("auth:expired"));
    });

    expect(screen.getByTestId("user")).toHaveTextContent("null");
  });
});
