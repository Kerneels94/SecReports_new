import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./useAuth";
import { authService } from "@/services";

jest.mock("@/services", () => ({
  authService: {
    me: jest.fn(),
    login: jest.fn(),
  },
}));

const mockMe = authService.me as jest.Mock;
const mockLogin = authService.login as jest.Mock;

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
    mockMe.mockResolvedValue({ data: { id: 1, name: "Alice", email: "a@b.com", role: "admin", department: null, status: "active", companyId: 1 } });

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

  it("login stores tokens and sets user", async () => {
    const userData = { id: 1, name: "Bob", email: "b@b.com", role: "reporter", department: null, status: "active", companyId: 1 };
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
      expect(localStorage.getItem("refreshToken")).toBe("rt");
      expect(screen.getByTestId("user")).toHaveTextContent("Bob");
    });
  });

  it("logout clears tokens and sets user to null", async () => {
    localStorage.setItem("accessToken", "at");
    localStorage.setItem("refreshToken", "rt");
    mockMe.mockResolvedValue({ data: { id: 1, name: "Charlie", email: "c@c.com", role: "manager", department: null, status: "active", companyId: 1 } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Charlie"));

    await userEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(screen.getByTestId("user")).toHaveTextContent("null");
  });
});
