import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { AppError } from '../utils/app-error.js';

/**
 * Creates a pre-configured Axios instance for the Square API.
 * - Injects Bearer token on every request
 * - Switches base URL between sandbox and production
 * - Logs request/response metadata for debugging
 * - Maps Axios errors to AppError (never leaks Square internals)
 */
export function createSquareClient(baseUrl: string, accessToken: string): AxiosInstance {
  const client = axios.create({
    baseURL: `${baseUrl}/v2`,
    timeout: 15_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // ── Request interceptor: inject auth + log ──
  client.interceptors.request.use(
    (req: InternalAxiosRequestConfig) => {
      req.headers.Authorization = `Bearer ${accessToken}`;
      // Attach timestamp for duration logging in response interceptor
      (req as InternalAxiosRequestConfig & { metadata: { startTime: number } }).metadata = {
        startTime: Date.now(),
      };
      console.info(`[square] → ${req.method?.toUpperCase()} ${req.url}`);
      return req;
    },
    (error) => {
      console.error('[square] Request setup error:', error.message);
      return Promise.reject(AppError.upstream('Failed to send request to Square'));
    },
  );

  // ── Response interceptor: log + error mapping ──
  client.interceptors.response.use(
    (res: AxiosResponse) => {
      const meta = (res.config as InternalAxiosRequestConfig & { metadata?: { startTime: number } })
        .metadata;
      const duration = meta ? Date.now() - meta.startTime : 0;
      console.info(`[square] ← ${res.status} ${res.config.url} (${duration}ms)`);
      return res;
    },
    (error) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        console.error(
          `[square] ← ${status ?? 'NETWORK_ERROR'} ${error.config?.url ?? 'unknown'}: ${error.message}`,
        );

        if (status === 401) {
          return Promise.reject(AppError.upstream('Square authentication failed'));
        }
        if (status === 404) {
          return Promise.reject(AppError.notFound('Resource not found in Square'));
        }
        if (status === 429) {
          return Promise.reject(AppError.upstream('Square API rate limit exceeded'));
        }
        return Promise.reject(AppError.upstream('Square API request failed'));
      }

      return Promise.reject(AppError.upstream('Unexpected error communicating with Square'));
    },
  );

  return client;
}
