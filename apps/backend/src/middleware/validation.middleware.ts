import type { Request, Response, NextFunction } from 'express';
import { type AnyZodObject, type ZodError, ZodSchema } from 'zod';

interface ValidationSchemas {
  /** Validate req.query */
  query?: AnyZodObject;
  /** Validate req.body */
  body?: ZodSchema;
  /** Validate req.params */
  params?: AnyZodObject;
}

/**
 * Generic Zod validation middleware.
 * Accepts schemas for query, body, and/or params.
 * On failure, returns 400 with field-level error details.
 *
 * @example
 * router.get('/items', validate({ query: itemsQuerySchema }), controller);
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ location: string; field: string; message: string }> = [];

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        collectErrors(result.error, 'query', errors);
      } else {
        req.query = result.data;
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        collectErrors(result.error, 'body', errors);
      } else {
        req.body = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        collectErrors(result.error, 'params', errors);
      } else {
        req.params = result.data as typeof req.params;
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      });
      return;
    }

    next();
  };
}

function collectErrors(
  zodError: ZodError,
  location: string,
  target: Array<{ location: string; field: string; message: string }>,
): void {
  for (const issue of zodError.issues) {
    target.push({
      location,
      field: issue.path.join('.'),
      message: issue.message,
    });
  }
}
