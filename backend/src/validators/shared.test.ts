import { z } from "zod";
import { validationErrorMessage, isGibberishEmail, shannonEntropy } from "./shared";

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

describe("isGibberishEmail", () => {
  it.each([
    "aaaaaa@gmail.com",
    "ababab@gmail.com",
    "11111@gmail.com",
    "asdflkjqwer@gmail.com",
    "qwerty@gmail.com",
    "asdfg123@gmail.com",
    "lkjhg@gmail.com",
    "@gmail.com",
  ])("rejects %s", (email) => {
    expect(isGibberishEmail(email)).toBe(true);
  });

  it.each([
    "anna@gmail.com",
    "bob@gmail.com",
    "john.smith@gmail.com",
    "j.schwarz+work@company.co.za",
    "knightsbridge@example.com",
    "liberty.property@example.com",
    "info@secreports.co.za",
    "jane94@gmail.com",
  ])("accepts %s", (email) => {
    expect(isGibberishEmail(email)).toBe(false);
  });
});

describe("shannonEntropy", () => {
  it("is 0 for one repeated char and 1 for two equal halves", () => {
    expect(shannonEntropy("aaaa")).toBe(0);
    expect(shannonEntropy("abab")).toBe(1);
  });
});
