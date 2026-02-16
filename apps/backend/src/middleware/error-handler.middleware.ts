import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';

/**
 * Central error handler — must be registered as the LAST middleware.
 *
 * Mapping rules:
 *  - AppError       → send its statusCode, code, and message as-is
 *  - ZodError       → 400 with field-level validation details
 *  - SyntaxError    → 400 invalid JSON body
 *  - Anything else  → 500 generic, log the real error, never expose internals
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── AppError (known, operational) ──
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // ── Zod validation error ──
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
      },
    });
    return;
  }

  // ── Malformed JSON body ──
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON',
      },
    });
    return;
  }

  // ── Unknown / unexpected error ──
  console.error('[error] Unhandled error:', err.stack ?? err.message);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
}
