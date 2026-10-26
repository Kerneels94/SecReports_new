const send = jest.fn();
jest.mock("resend", () => ({ Resend: jest.fn(() => ({ emails: { send } })) }));

const { sendMail } = require("./email.service");

describe("email.service Resend transport", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => consoleError.mockRestore());

  it("maps sendMail onto resend.emails.send with labelled subject", async () => {
    send.mockResolvedValue({ data: { id: "r1" }, error: null });

    const result = await sendMail({
      to: "someone@example.com",
      subject: "contact",
      data: { name: "Ada", email: "ada@example.com", message: "Hi" },
      replyTo: "ada@example.com",
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["someone@example.com"],
        subject: "New SecReports Website Enquiry",
        replyTo: "ada@example.com",
      }),
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ id: "r1" });
  });

  it("base64-encodes Buffer attachments for Resend", async () => {
    send.mockResolvedValue({ data: { id: "r2" }, error: null });

    const content = Buffer.from("id,addr\n1,main st");
    await sendMail({
      to: "someone@example.com",
      subject: "report",
      data: {
        companyName: "Acme",
        incidentAddress: "Main St",
        incidentType: "theft",
      },
      attachments: [
        { filename: "theft.csv", content, contentType: "text/csv" },
      ],
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          {
            filename: "theft.csv",
            content: content.toString("base64"),
            contentType: "text/csv",
          },
        ],
      }),
    );
  });

  it("returns the error Resend resolves with instead of throwing", async () => {
    const apiError = {
      message: "Rate limit exceeded",
      name: "validation_error",
    };
    send.mockResolvedValue({ data: null, error: apiError });

    const result = await sendMail({
      to: "someone@example.com",
      subject: "contact",
      data: { name: "Ada", email: "ada@example.com", message: "Hi" },
    });

    expect(result.error).toBe(apiError);
  });

  it("surfaces thrown transport failures as an error result", async () => {
    send.mockRejectedValue(new Error("socket hang up"));

    const result = await sendMail({
      to: "someone@example.com",
      subject: "contact",
      data: { name: "Ada", email: "ada@example.com", message: "Hi" },
    });

    expect(result.error).toBeInstanceOf(Error);
  });
});
