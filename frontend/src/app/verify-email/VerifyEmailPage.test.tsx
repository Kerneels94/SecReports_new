import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "./page";
import { api } from "@/services/api";

jest.mock("@/services/api", () => ({
  api: { post: jest.fn() },
}));

const mockPost = api.post as jest.Mock;

beforeEach(() => {
  jest.restoreAllMocks();
  mockPost.mockReset();
  window.history.replaceState({}, "", "/verify-email");
});

describe("VerifyEmailPage", () => {
  it("renders an svg icon while verifying", () => {
    window.history.replaceState({}, "", "/verify-email?token=abc");
    mockPost.mockReturnValue(new Promise(() => {}));

    const { container } = render(<VerifyEmailPage />);

    expect(screen.getByText("Verifying...")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an svg icon on success", async () => {
    window.history.replaceState({}, "", "/verify-email?token=abc");
    mockPost.mockResolvedValue({ data: { message: "Email verified" } });

    const { container } = render(<VerifyEmailPage />);

    await waitFor(() =>
      expect(screen.getByText("Email Verified")).toBeInTheDocument(),
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders an svg icon on error when the token is missing", async () => {
    const { container } = render(<VerifyEmailPage />);

    await waitFor(() =>
      expect(screen.getByText("Verification Failed")).toBeInTheDocument(),
    );
    expect(screen.getByText("Missing verification token")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
