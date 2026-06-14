/**
 * Base application error — all custom API errors extend this class.
 * Carries an HTTP status code, a machine-readable error code, and optional details.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** 404 — the requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, "NOT_FOUND", `${resource} not found`);
  }
}

/** 401 — authentication is missing or the provided credentials are invalid. */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, "UNAUTHORIZED", message);
  }
}

/** 403 — the authenticated user lacks permission for this action. */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, "FORBIDDEN", message);
  }
}

/** 400 — the request payload failed validation rules. */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

/** 409 — the request conflicts with the current state of the resource. */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}
