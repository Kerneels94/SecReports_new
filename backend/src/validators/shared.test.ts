import { z } from "zod";
import { validationErrorMessage } from "./shared";

describe("validationErrorMessage", () => {
  it("prefixes the failing field name", () => {
    const result = z.object({ operatorName: z.string().min(1) }).safeParse({
      operatorName: "",
    });

    expect(validationErrorMessage(result.error!)).toBe(
      "Operator Name: Too small: expected string to have >=1 characters",
    );
  });

  it("does not repeat a field name already in the message", () => {
    const result = z
      .object({ email: z.string().email("Enter a valid email address") })
      .safeParse({ email: "nope" });

    expect(validationErrorMessage(result.error!)).toBe(
      "Enter a valid email address",
    );
  });

  it("returns the fallback when there are no issues", () => {
    expect(validationErrorMessage(new z.ZodError([]))).toBe("Invalid input");
  });
});
