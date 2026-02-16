/**
 * Application error class for structured error handling.
 * All known errors thrown in the app should use this class
 * so the error handler middleware can format them consistently.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new AppError(message, 400, code);
  }

  static notFound(message: string, code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED') {
    return new AppError(message, 429, code);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code, false);
  }

  static upstream(message = 'Upstream service error', code = 'UPSTREAM_ERROR') {
    return new AppError(message, 502, code);
  }
}
