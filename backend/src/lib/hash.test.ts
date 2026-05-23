import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "./hash";

jest.mock("bcrypt");

describe("hashPassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls bcrypt.hash with password and SALT_ROUNDS=12", async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed123");
    const result = await hashPassword("mypassword");
    expect(bcrypt.hash).toHaveBeenCalledWith("mypassword", 12);
    expect(result).toBe("hashed123");
  });
});

describe("comparePassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns true for matching password", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const result = await comparePassword("mypassword", "hashed");
    expect(result).toBe(true);
  });

  it("returns false for non-matching password", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const result = await comparePassword("wrong", "hashed");
    expect(result).toBe(false);
  });
});
