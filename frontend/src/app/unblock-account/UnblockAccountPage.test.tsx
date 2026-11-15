import { render, screen, waitFor } from "@testing-library/react";
import UnblockAccountPage from "./page";
import { api } from "@/services/api";

jest.mock("@/services/api", () => ({
  api: { post: jest.fn() },
}));

const mockPost = api.post as jest.Mock;

beforeEach(() => {
  mockPost.mockReset();
  window.history.replaceState({}, "", "/unblock-account");
});

describe("UnblockAccountPage", () => {
  it("posts the token, strips it from the URL and shows success", async () => {
    window.history.replaceState({}, "", "/unblock-account?token=abc");
    mockPost.mockResolvedValue({ data: { message: "Your account has been unblocked." } });

    render(<UnblockAccountPage />);

    await waitFor(() => expect(screen.getByText("Account Unblocked")).toBeInTheDocument());
    expect(mockPost).toHaveBeenCalledWith("/auth/unblock", { token: "abc" });
    expect(window.location.search).toBe("");
    expect(screen.getByRole("link", { name: "Go to Login" })).toHaveAttribute("href", "/login");
  });

  it("shows the server error and offers a password reset", async () => {
    window.history.replaceState({}, "", "/unblock-account?token=old");
    mockPost.mockRejectedValue(new Error("Invalid or expired unblock link."));

    render(<UnblockAccountPage />);

    await waitFor(() => expect(screen.getByText("Unblock Failed")).toBeInTheDocument());
    expect(screen.getByText("Invalid or expired unblock link.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset your password instead" })).toHaveAttribute("href", "/forgot-password");
  });

  it("errors without a token and does not call the API", async () => {
    render(<UnblockAccountPage />);

    await waitFor(() => expect(screen.getByText("Missing unblock token")).toBeInTheDocument());
    expect(mockPost).not.toHaveBeenCalled();
  });
});
