/** Errors the HTTP layer knows how to turn into a response. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, "not_found", message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "validation_failed", message, details);
  }
}

/** The product source failed or returned data we cannot use. */
export class UpstreamError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(502, "upstream_unavailable", message);
    this.cause = options?.cause;
  }
}
