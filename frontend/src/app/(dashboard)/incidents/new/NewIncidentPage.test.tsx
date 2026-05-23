import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import NewIncidentPage from "./page";
import { incidentService } from "@/services";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/services", () => ({
  incidentService: { create: jest.fn() },
}));

const mockRouter = { push: jest.fn() };
const mockCreate = incidentService.create as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
});

describe("NewIncidentPage", () => {
  it("renders form with all fields", () => {
    render(<NewIncidentPage />);
    expect(screen.getByRole("heading", { name: /report incident/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Severity")).toBeInTheDocument();
    expect(screen.getByLabelText("Incident Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Location")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit report/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
      expect(screen.getByText("Description is required")).toBeInTheDocument();
      expect(screen.getByText("Type is required")).toBeInTheDocument();
      expect(screen.getByText("Category is required")).toBeInTheDocument();
    });
  });

  it("calls create and redirects on success", async () => {
    mockCreate.mockResolvedValue({ success: true, data: { id: 1 } });
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Title"), "Server Down");
    await user.type(screen.getByLabelText("Description"), "Server is down");
    await user.type(screen.getByLabelText("Type"), "outage");
    await user.type(screen.getByLabelText("Category"), "Infrastructure");
    await user.type(screen.getByLabelText("Location"), "DC-1");

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        title: "Server Down",
        description: "Server is down",
        type: "outage",
        severity: "medium",
        category: "Infrastructure",
        incidentDate: expect.any(String),
        location: "DC-1",
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/incidents");
    });
  });

  it("shows error on failure", async () => {
    mockCreate.mockRejectedValue(new Error("Creation failed"));
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Title"), "Server Down");
    await user.type(screen.getByLabelText("Description"), "Server is down");
    await user.type(screen.getByLabelText("Type"), "outage");
    await user.type(screen.getByLabelText("Category"), "Infrastructure");

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText("Creation failed")).toBeInTheDocument();
    });
  });

  it("cancel button navigates back to incidents", async () => {
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockRouter.push).toHaveBeenCalledWith("/incidents");
  });

  it("severity select has all options", () => {
    render(<NewIncidentPage />);
    const select = screen.getByLabelText("Severity");
    expect(select).toHaveValue("medium");
  });
});
