import type { Request, Response, NextFunction } from 'express';

/**
 * Logs every incoming request with method, path, status code,
 * and response time in milliseconds.
 * Hooks into the `finish` event on the response so that the
 * status code is available by the time we log.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    if (res.statusCode >= 500) {
      console.error(`[http] ${message}`);
    } else if (res.statusCode >= 400) {
      console.warn(`[http] ${message}`);
    } else {
      console.info(`[http] ${message}`);
    }
  });

  next();
}
