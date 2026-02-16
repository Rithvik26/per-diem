import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssueCode } from 'zod';
import { errorHandler } from '../middleware/error-handler.middleware.js';
import { AppError } from '../utils/app-error.js';

/** Create a mock Express response. */
function mockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const mockReq = {} as Request;
const mockNext = vi.fn() as NextFunction;

describe('errorHandler', () => {
  describe('AppError handling', () => {
    it('returns 400 for bad request', () => {
      const err = AppError.badRequest('Invalid location ID');
      const res = mockResponse();

      errorHandler(err, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid location ID',
        },
      });
    });

    it('returns 404 for not found', () => {
      const err = AppError.notFound('Location not found');
      const res = mockResponse();

      errorHandler(err, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'Location not found',
        },
      });
    });

    it('returns 429 for rate limiting', () => {
      const err = AppError.tooManyRequests();
      const res = mockResponse();

      errorHandler(err, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
        },
      });
    });

    it('returns 502 for upstream errors', () => {
      const err = AppError.upstream('Square API request failed');
      const res = mockResponse();

      errorHandler(err, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UPSTREAM_ERROR',
          message: 'Square API request failed',
        },
      });
    });

    it('returns 500 for internal errors', () => {
      const err = AppError.internal();
      const res = mockResponse();

      errorHandler(err, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    });

    it('preserves custom error codes', () => {
      const err = new AppError('Custom message', 422, 'UNPROCESSABLE');
      const res = mockResponse();

      errorHandler(err, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UNPROCESSABLE',
          message: 'Custom message',
        },
      });
    });
  });

  describe('ZodError handling', () => {
    it('returns 400 with field-level details', () => {
      const zodError = new ZodError([
        {
          code: ZodIssueCode.too_small,
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          message: 'Required',
          path: ['location_id'],
        },
      ]);
      const res = mockResponse();

      errorHandler(zodError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            {
              field: 'location_id',
              message: 'Required',
            },
          ],
        },
      });
    });
  });

  describe('SyntaxError handling', () => {
    it('returns 400 for malformed JSON', () => {
      const err = Object.assign(new SyntaxError('Unexpected token'), {
        body: '{ invalid json',
      });
      const res = mockResponse();

      errorHandler(err, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_JSON',
          message: 'Request body contains invalid JSON',
        },
      });
    });
  });

  describe('Unknown error handling', () => {
    it('returns 500 and does not expose error details', () => {
      const err = new Error('database connection failed with credentials xyz');
      const res = mockResponse();

      // Suppress console.error in test output
      vi.spyOn(console, 'error').mockImplementation(() => {});

      errorHandler(err, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });

      // The original error message must NOT be in the response
      const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(JSON.stringify(jsonArg)).not.toContain('database connection failed');
    });
  });
});
