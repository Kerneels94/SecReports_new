import { submitContact } from "./contact.routes";
import { sendMail } from "../services/email.service";
import { ValidationError } from "../lib/errors";
import { hasMxRecord } from "../lib/email";

jest.mock("../services/email.service", () => ({
  sendMail: jest.fn(),
}));

jest.mock("../lib/email", () => ({
  hasMxRecord: jest.fn(),
}));

const sendMailMock = sendMail as jest.Mock;
const hasMxRecordMock = hasMxRecord as jest.Mock;

describe("submitContact", () => {
  let request: any;
  let reply: any;

  const validBody = {
    name: "Thabo Mokoena",
    email: "thabo@acmesecurity.co.za",
    company: "Acme Security",
    message: "We need pricing for 20 users.",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sendMailMock.mockResolvedValue({ data: {} });
    hasMxRecordMock.mockResolvedValue(true);
    request = { body: { ...validBody }, log: { error: jest.fn() } };
    reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };
  });

  it("emails the enquiry to the support inbox with the sender as Reply-To", async () => {
    await submitContact(request, reply);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith({
      to: process.env.FROM_EMAIL || "support@secreports.co.za",
      subject: "contact",
      replyTo: "thabo@acmesecurity.co.za",
      data: validBody,
    });
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("accepts a submission without a company", async () => {
    request.body = { name: validBody.name, email: validBody.email, message: validBody.message };

    await submitContact(request, reply);

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ company: undefined }),
      }),
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it("rejects invalid input before sending email", async () => {
    request.body = { ...validBody, email: "nope" };

    await expect(submitContact(request, reply)).rejects.toThrow(ValidationError);
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("rejects a missing body", async () => {
    request.body = undefined;

    await expect(submitContact(request, reply)).rejects.toThrow(ValidationError);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("fails when the email cannot be delivered", async () => {
    sendMailMock.mockResolvedValue({ error: new Error("smtp down") });

    await expect(submitContact(request, reply)).rejects.toThrow(
      "Failed to deliver contact enquiry",
    );
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("rejects an email whose domain has no MX record", async () => {
    hasMxRecordMock.mockResolvedValue(false);

    await expect(submitContact(request, reply)).rejects.toThrow(ValidationError);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("rejects a gibberish email before any lookup", async () => {
    request.body.email = "asdflkjqwer@gmail.com";

    await expect(submitContact(request, reply)).rejects.toThrow(ValidationError);
    expect(hasMxRecordMock).not.toHaveBeenCalled();
  });
});
