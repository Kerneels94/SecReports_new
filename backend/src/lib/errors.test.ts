import { AppError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError } from "./errors";

describe("AppError", () => {
  it("sets statusCode, code, message, name, and details", () => {
    const err = new AppError(400, "BAD_REQUEST", "bad request", { detail: "x" });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.message).toBe("bad request");
    expect(err.name).toBe("AppError");
    expect(err.details).toEqual({ detail: "x" });
  });

  it("extends Error", () => {
    expect(new AppError(500, "ERR", "msg")).toBeInstanceOf(Error);
  });
});

describe("NotFoundError", () => {
  it("has 404 status, NOT_FOUND code, and message with resource name", () => {
    const err = new NotFoundError("User");
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("User not found");
  });
});

describe("UnauthorizedError", () => {
  it("has 401, UNAUTHORIZED, and default message", () => {
    const err = new UnauthorizedError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message).toBe("Unauthorized");
  });

  it("accepts custom message", () => {
    const err = new UnauthorizedError("Custom");
    expect(err.message).toBe("Custom");
  });
});

describe("ForbiddenError", () => {
  it("has 403, FORBIDDEN, and default message", () => {
    const err = new ForbiddenError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toBe("Forbidden");
  });

  it("accepts custom message", () => {
    const err = new ForbiddenError("Access denied");
    expect(err.message).toBe("Access denied");
  });
});

describe("ValidationError", () => {
  it("has 400, VALIDATION_ERROR, message, and details", () => {
    const err = new ValidationError("Invalid input", { field: "email" });
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Invalid input");
    expect(err.details).toEqual({ field: "email" });
  });
});

describe("ConflictError", () => {
  it("has 409, CONFLICT, and message", () => {
    const err = new ConflictError("Already exists");
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
    expect(err.message).toBe("Already exists");
  });
});
