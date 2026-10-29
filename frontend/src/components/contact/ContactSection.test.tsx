import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactSection, { validateContact } from "./ContactSection";
import { contactService } from "@/services";

jest.mock("@/services", () => ({
  contactService: { send: jest.fn() },
}));

const mockSend = contactService.send as jest.Mock;

const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  values: Partial<Record<"Name" | "Email" | "Company" | "Message", string>> = {},
) => {
  await user.type(screen.getByLabelText("Name"), values.Name ?? "Thabo Mokoena");
  await user.type(
    screen.getByLabelText("Email"),
    values.Email ?? "thabo@acme.co.za",
  );
  await user.type(
    screen.getByLabelText("Company"),
    values.Company ?? "Acme Security",
  );
  await user.type(
    screen.getByLabelText("Message"),
    values.Message ?? "Pricing for 20 users please.",
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("validateContact", () => {
  const valid = {
    name: "Thabo Mokoena",
    email: "thabo@acme.co.za",
    company: "Acme Security",
    message: "Pricing for 20 users please.",
  };

  it("accepts a valid form", () => {
    expect(validateContact(valid)).toEqual({});
  });

  it("requires a name and message and a valid email", () => {
    expect(validateContact({ ...valid, name: " ", email: "nope", message: "" }))
      .toEqual({
        name: "Name is required",
        email: "Invalid email address",
        message: "Message is required",
      });
  });

  it("rejects over-long name, company, and message", () => {
    const errors = validateContact({
      ...valid,
      name: "a".repeat(256),
      company: "a".repeat(256),
      message: "a".repeat(5001),
    });
    expect(errors.name).toBe("Name is too long");
    expect(errors.company).toBe("Company name is too long");
    expect(errors.message).toBe("Message must be under 5000 characters");
  });
});

describe("ContactSection", () => {
  it("renders the section heading and every form field", () => {
    render(<ContactSection />);

    expect(
      screen.getByRole("heading", { name: /talk to our team/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Company")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send message/i }),
    ).toBeInTheDocument();
  });

  it("exposes the support mailbox as a mailto link", () => {
    render(<ContactSection />);
    expect(
      screen.getByRole("link", { name: "support@secreports.co.za" }),
    ).toHaveAttribute("href", "mailto:support@secreports.co.za");
  });

  it("submits all four fields and shows the confirmation state", async () => {
    mockSend.mockResolvedValue({ success: true, data: { message: "Sent" } });
    render(<ContactSection />);
    const user = userEvent.setup();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(1));
    expect(mockSend).toHaveBeenCalledWith({
      name: "Thabo Mokoena",
      email: "thabo@acme.co.za",
      company: "Acme Security",
      message: "Pricing for 20 users please.",
    });
    expect(await screen.findByText(/message sent/i)).toBeInTheDocument();
  });

  it("omits an empty company from the payload", async () => {
    mockSend.mockResolvedValue({ success: true, data: {} });
    render(<ContactSection />);
    const user = userEvent.setup();

    await fillForm(user);
    await user.clear(screen.getByLabelText("Company"));
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ company: undefined }),
      ),
    );
  });

  it("blocks submission and shows field errors when the form is empty", async () => {
    render(<ContactSection />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Message is required")).toBeInTheDocument();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("rejects an invalid email address", async () => {
    render(<ContactSection />);
    const user = userEvent.setup();

    await fillForm(user, { Email: "not-an-email" });
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText("Invalid email address"),
    ).toBeInTheDocument();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("shows the API error message when submission fails", async () => {
    mockSend.mockRejectedValue(new Error("Too many requests"));
    render(<ContactSection />);
    const user = userEvent.setup();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText("Too many requests")).toBeInTheDocument();
  });

  it("returns to a blank form after sending another message", async () => {
    mockSend.mockResolvedValue({ success: true, data: {} });
    render(<ContactSection />);
    const user = userEvent.setup();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await screen.findByText(/message sent/i);

    await user.click(
      screen.getByRole("button", { name: /send another message/i }),
    );

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });
});