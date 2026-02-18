import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './services/config.service.js';
import { createCacheProvider } from './services/cache.service.js';
import { createSquareClient } from './services/square-client.service.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import locationsRouter from './routes/locations.route.js';
import categoriesRouter from './routes/categories.route.js';
import catalogRouter from './routes/catalog.route.js';
import webhooksRouter from './routes/webhooks.route.js';

// ── Bootstrap services ──────────────────────────────────────

const cache = createCacheProvider(config.CACHE_PROVIDER, config.CACHE_TTL_SECONDS, config.REDIS_URL);
const squareClient = createSquareClient(config.SQUARE_BASE_URL, config.SQUARE_ACCESS_TOKEN);

// Make services available to route handlers via app.locals
const app = express();

// Trust proxy for proper client IP detection in production (Render, Railway, etc.)
app.set('trust proxy', 1);

app.locals.cache = cache;
app.locals.squareClient = squareClient;
app.locals.config = config;

// ── Global middleware ───────────────────────────────────────

app.use(requestLogger);

app.use(
  cors({
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
);

app.use(express.json({ limit: '1mb' }));

// Rate limiter: 50 requests per minute per IP
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    },
  },
});
app.use('/api', limiter);

// ── Routes ──────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/locations', locationsRouter);
app.use('/api/catalog/categories', categoriesRouter);
app.use('/api/catalog', catalogRouter);

// Webhook routes (no rate limiting on webhooks)
app.use('/webhooks/square', webhooksRouter);

// ── Error handler (must be last) ────────────────────────────

app.use(errorHandler);

// ── Start server ────────────────────────────────────────────

app.listen(config.PORT, () => {
  console.info(`[server] Running on http://localhost:${config.PORT}`);
  console.info(`[server] Environment: ${config.NODE_ENV}`);
  console.info(`[server] Cache provider: ${config.CACHE_PROVIDER}`);
  console.info(`[server] Square environment: ${config.SQUARE_ENVIRONMENT}`);
});

export default app;
