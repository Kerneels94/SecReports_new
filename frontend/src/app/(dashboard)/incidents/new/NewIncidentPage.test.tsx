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
  it("renders form with all section headings", () => {
    render(<NewIncidentPage />);
    expect(screen.getByRole("heading", { name: /report incident/i })).toBeInTheDocument();
    expect(screen.getByText("Response Details")).toBeInTheDocument();
    expect(screen.getByText("Client & Property")).toBeInTheDocument();
    expect(screen.getByText("Incident")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit report/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("renders all new form fields", () => {
    render(<NewIncidentPage />);
    expect(screen.getByLabelText("Operator Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Dispatcher")).toBeInTheDocument();
    expect(screen.getByLabelText("Dispatch Time")).toBeInTheDocument();
    expect(screen.getByLabelText("Arrival Time")).toBeInTheDocument();
    expect(screen.getByLabelText("Call Sign")).toBeInTheDocument();
    expect(screen.getByLabelText("Property Address")).toBeInTheDocument();
    expect(screen.getByLabelText("Client Name and Surname")).toBeInTheDocument();
    expect(screen.getByLabelText("Client Code")).toBeInTheDocument();
    expect(screen.getByLabelText("Business or Complex Name")).toBeInTheDocument();
    expect(screen.getByLabelText("SAPS Reference")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Report")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Type" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe the type...")).toBeInTheDocument();
    expect(screen.getByLabelText("Incident Date")).toBeInTheDocument();
  });

  it("shows validation errors for required fields", async () => {
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
      expect(screen.getByText("Description is required")).toBeInTheDocument();
      expect(screen.getByText("Type is required")).toBeInTheDocument();
      expect(screen.getByText("Operator name is required")).toBeInTheDocument();
      expect(screen.getByText("Dispatcher is required")).toBeInTheDocument();
    });
  });

  it("calls create and redirects on success", async () => {
    mockCreate.mockResolvedValue({ success: true, data: { id: 1 } });
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Operator Name"), "John Op");
    await user.type(screen.getByLabelText("Dispatcher"), "Jane Disp");
    await user.type(screen.getByLabelText("Call Sign"), "AR-42");
    await user.type(screen.getByLabelText("Property Address"), "123 Main St");
    await user.type(screen.getByLabelText("Client Name and Surname"), "Bob Client");
    await user.type(screen.getByLabelText("Client Code"), "C-001");
    await user.type(screen.getByLabelText("Business or Complex Name"), "Biz Hub");
    await user.type(screen.getByLabelText("SAPS Reference"), "SAPS-123");
    await user.type(screen.getByLabelText("Title"), "Server Down");
    await user.type(screen.getByLabelText("Report"), "Server is down");
    await user.selectOptions(screen.getByRole("combobox", { name: "Type" }), "Attempted");
    await user.type(screen.getByPlaceholderText("Describe the type..."), "house break in");

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        operatorName: "John Op",
        dispatcher: "Jane Disp",
        dispatchTime: "",
        arrivalTime: "",
        callSign: "AR-42",
        propertyAddress: "123 Main St",
        clientName: "Bob Client",
        clientCode: "C-001",
        businessOrComplex: "Biz Hub",
        sapsReference: "SAPS-123",
        title: "Server Down",
        description: "Server is down",
        type: "Attempted house break in",
        incidentDate: expect.any(String),
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/incidents");
    });
  });

  it("shows error on failure", async () => {
    mockCreate.mockRejectedValue(new Error("Creation failed"));
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Operator Name"), "John");
    await user.type(screen.getByLabelText("Dispatcher"), "Jane");
    await user.type(screen.getByLabelText("Title"), "Server Down");
    await user.type(screen.getByLabelText("Report"), "Server is down");
    await user.selectOptions(screen.getByRole("combobox", { name: "Type" }), "Attempted");
    await user.type(screen.getByPlaceholderText("Describe the type..."), "fire");

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

});

