import { Router, type Request, type Response, type NextFunction } from 'express';
import type { SquareWebhookEvent } from '@per-diem/shared-types';
import type { CacheProvider } from '../services/cache.service.js';

const router = Router();

/**
 * POST /webhooks/square/catalog-updated
 *
 * Handles Square webhook notifications for catalog updates.
 *
 * When a merchant updates their menu in Square, Square sends a webhook
 * with type "catalog.version.updated". We invalidate all catalog-related
 * caches to ensure fresh data on the next request.
 *
 * Square Webhook Event Structure:
 * {
 *   merchant_id: "...",
 *   type: "catalog.version.updated",
 *   event_id: "...",
 *   created_at: "2024-01-01T00:00:00Z",
 *   data: {
 *     type: "catalog",
 *     id: "...",
 *     object: { ... }
 *   }
 * }
 *
 * Cache Invalidation Strategy:
 * - Clear all keys starting with "catalog:" (all location-specific catalogs)
 * - Clear all keys starting with "categories:" (all location-specific categories)
 * - Locations cache is NOT cleared (location data changes less frequently)
 *
 * Security Note:
 * In production, you should verify the webhook signature using
 * SQUARE_WEBHOOK_SIGNATURE_KEY to ensure the request is from Square.
 * See: https://developer.squareup.com/docs/webhooks/step3validate
 */
router.post('/catalog-updated', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body as SquareWebhookEvent;

    console.info(`[webhook] Received Square webhook: ${event.type} (event_id: ${event.event_id})`);

    // Handle catalog version updates
    if (event.type === 'catalog.version.updated') {
      const cache = req.app.locals.cache as CacheProvider;

      // Invalidate all catalog and category caches
      console.info('[webhook] Invalidating catalog caches...');
      await cache.clear('catalog:');
      await cache.clear('categories:');
      console.info('[webhook] Cache invalidation complete');

      return res.status(200).json({
        message: 'Webhook processed successfully',
        event_id: event.event_id,
        caches_cleared: ['catalog:*', 'categories:*'],
      });
    }

    // For other event types, just acknowledge receipt
    console.info(`[webhook] Event type ${event.type} received but not processed`);
    res.status(200).json({
      message: 'Webhook received',
      event_id: event.event_id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
