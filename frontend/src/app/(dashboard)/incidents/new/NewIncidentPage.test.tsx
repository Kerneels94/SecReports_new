import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import NewIncidentPage from "./page";
import { incidentService } from "@/services";
import { searchAddress } from "@/lib/geocode";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/services", () => ({
  incidentService: { create: jest.fn() },
}));

jest.mock("@/lib/geocode", () => ({
  ...jest.requireActual("@/lib/geocode"),
  searchAddress: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/components/map/LocationMap", () => ({
  LocationMap: ({ lat, lng }: { lat: number; lng: number }) => (
    <div data-testid="location-map">{`${lat},${lng}`}</div>
  ),
}));

const mockSearch = searchAddress as jest.Mock;
const mockRouter = { push: jest.fn() };
const mockCreate = incidentService.create as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  mockSearch.mockResolvedValue([]);
});

describe("NewIncidentPage", () => {
  it("renders form with all section headings", () => {
    render(<NewIncidentPage />);
    expect(screen.getByRole("heading", { name: /report incident/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Personnel & response" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Client & property" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Incident" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Report" })).toBeInTheDocument();
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
    expect(screen.getByLabelText("Suburb")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toBeInTheDocument();
    expect(screen.getByLabelText("Client Name and Surname")).toBeInTheDocument();
    expect(screen.getByLabelText("Client Code")).toBeInTheDocument();
    expect(screen.getByLabelText("Business or Complex Name")).toBeInTheDocument();
    expect(screen.getByLabelText("SAPS Reference")).toBeInTheDocument();
    expect(screen.getByLabelText("Report")).toBeInTheDocument();
    expect(screen.getByText("Incident type")).toBeInTheDocument();
    expect(screen.getByLabelText("Alarm Type")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Attempted" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Positive" })).toBeInTheDocument();
    expect(screen.getByLabelText("Incident Date")).toBeInTheDocument();
  });

  it("defaults the incident date to today in local time", () => {
    render(<NewIncidentPage />);
    const input = screen.getByLabelText("Incident Date") as HTMLInputElement;
    expect(input.value).toBe(new Date().toLocaleDateString("en-CA"));
  });

  it("shows validation errors for required fields", async () => {
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText("Description is required")).toBeInTheDocument();
      expect(screen.getByText("Type is required")).toBeInTheDocument();
      expect(screen.getByText("Alarm type is required")).toBeInTheDocument();
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
    await user.type(screen.getByLabelText("Suburb"), "Rivonia");
    await user.type(screen.getByLabelText("City"), "Johannesburg");
    await user.type(screen.getByLabelText("Client Name and Surname"), "Bob Client");
    await user.type(screen.getByLabelText("Client Code"), "C-001");
    await user.type(screen.getByLabelText("Business or Complex Name"), "Biz Hub");
    await user.type(screen.getByLabelText("SAPS Reference"), "SAPS-123");
    await user.type(screen.getByLabelText("Report"), "Server is down");
    await user.click(screen.getByRole("radio", { name: "Attempted" }));
    await user.selectOptions(screen.getByLabelText("Alarm Type"), "Panic");

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        operatorName: "John Op",
        dispatcher: "Jane Disp",
        dispatchTime: undefined,
        arrivalTime: undefined,
        callSign: "AR-42",
        propertyAddress: "123 Main St",
        suburb: "Rivonia",
        city: "Johannesburg",
        clientName: "Bob Client",
        clientCode: "C-001",
        businessOrComplex: "Biz Hub",
        sapsReference: "SAPS-123",
        title: "123 Main St",
        description: "Server is down",
        type: "Attempted",
        alarmType: "Panic",
        incidentDate: expect.any(String),
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/incidents");
    });
  });

  it("sends dispatch and arrival times as UTC instants from the browser's time zone", async () => {
    mockCreate.mockResolvedValue({});
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Operator Name"), "John");
    await user.type(screen.getByLabelText("Dispatcher"), "Jane");
    fireEvent.change(screen.getByLabelText("Dispatch Time"), { target: { value: "2026-10-16T23:50" } });
    fireEvent.change(screen.getByLabelText("Arrival Time"), { target: { value: "2026-10-17T00:05" } });
    await user.type(screen.getByLabelText("Report"), "Server is down");
    await user.click(screen.getByRole("radio", { name: "Attempted" }));
    await user.selectOptions(screen.getByLabelText("Alarm Type"), "Panic");

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          dispatchTime: new Date("2026-10-16T23:50").toISOString(),
          arrivalTime: new Date("2026-10-17T00:05").toISOString(),
        }),
      );
    });
  });

  it("shows error on failure", async () => {
    mockCreate.mockRejectedValue(new Error("Creation failed"));
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Operator Name"), "John");
    await user.type(screen.getByLabelText("Dispatcher"), "Jane");
    await user.type(screen.getByLabelText("Report"), "Server is down");
    await user.click(screen.getByRole("radio", { name: "Attempted" }));
    await user.selectOptions(screen.getByLabelText("Alarm Type"), "Panic");

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText("Creation failed")).toBeInTheDocument();
    });
  });

  it("shows the live response time once both times are set", () => {
    render(<NewIncidentPage />);

    fireEvent.change(screen.getByLabelText("Dispatch Time"), { target: { value: "2026-10-16T23:50" } });
    fireEvent.change(screen.getByLabelText("Arrival Time"), { target: { value: "2026-10-17T00:05" } });

    expect(screen.getByText("15 min response time")).toBeInTheDocument();
  });

  it("blocks submit when arrival is before dispatch", async () => {
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Operator Name"), "John");
    await user.type(screen.getByLabelText("Dispatcher"), "Jane");
    fireEvent.change(screen.getByLabelText("Dispatch Time"), { target: { value: "2026-10-17T00:05" } });
    fireEvent.change(screen.getByLabelText("Arrival Time"), { target: { value: "2026-10-16T23:50" } });
    await user.type(screen.getByLabelText("Report"), "Server is down");
    await user.click(screen.getByRole("radio", { name: "Attempted" }));
    await user.selectOptions(screen.getByLabelText("Alarm Type"), "Panic");

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText("Arrival time must be after the dispatch time.")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("cancel button navigates back to incidents", async () => {
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockRouter.push).toHaveBeenCalledWith("/incidents");
  });


  it("fills suburb, city and the map pin when an address suggestion is picked", async () => {
    mockSearch.mockResolvedValue([
      { label: "12 Oak Ave, Rivonia, Sandton", street: "12 Oak Ave", suburb: "Rivonia", city: "Sandton", lat: -26.05, lng: 28.06 },
    ]);
    mockCreate.mockResolvedValue({});
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Property Address"), "12 Oak");
    await user.click(await screen.findByRole("option", { name: "12 Oak Ave, Rivonia, Sandton" }));

    expect(screen.getByLabelText("Property Address")).toHaveValue("12 Oak Ave");
    expect(screen.getByLabelText("Suburb")).toHaveValue("Rivonia");
    expect(screen.getByLabelText("City")).toHaveValue("Sandton");
    expect(screen.getByTestId("location-map")).toHaveTextContent("-26.05,28.06");
    expect(screen.getByRole("link", { name: /open in google maps/i })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=-26.05,28.06",
    );

    await user.type(screen.getByLabelText("Operator Name"), "John");
    await user.type(screen.getByLabelText("Dispatcher"), "Jane");
    await user.type(screen.getByLabelText("Report"), "Break-in");
    await user.click(screen.getByRole("radio", { name: "Positive" }));
    await user.selectOptions(screen.getByLabelText("Alarm Type"), "Burglary");
    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ alarmType: "Burglary", latitude: -26.05, longitude: 28.06 }),
      );
    });
  });

  it("lets the operator drop a pin by hand and remove it", async () => {
    render(<NewIncidentPage />);
    const user = userEvent.setup();

    expect(screen.queryByTestId("location-map")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /pin it on the map/i }));
    expect(screen.getByTestId("location-map")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /remove pin/i }));
    expect(screen.queryByTestId("location-map")).not.toBeInTheDocument();
  });
});
