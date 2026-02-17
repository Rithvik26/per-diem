import { Router, type Request, type Response, type NextFunction } from 'express';
import type { AxiosInstance } from 'axios';
import { z } from 'zod';
import type {
  SquareSearchCatalogResponse,
  SquareCatalogObject,
  SquareCatalogItem,
  CatalogResponse,
} from '@per-diem/shared-types';
import type { CacheProvider } from '../services/cache.service.js';
import { CacheKeys } from '../services/cache.service.js';
import { validate } from '../middleware/validation.middleware.js';
import { aggregateSquarePages } from '../utils/pagination.js';
import {
  filterItemsByLocation,
  groupItemsByCategory,
} from '../transformers/square-catalog.transformer.js';

const router = Router();

// Validation schema for query parameters
const catalogQuerySchema = z.object({
  location_id: z.string().min(1, 'location_id is required'),
});

/**
 * GET /api/catalog?location_id=<ID>
 *
 * Returns full catalog with items grouped by category for a specific location.
 *
 * Process:
 * 1. Fetch ALL catalog items from Square (handles pagination automatically)
 * 2. Include related_objects (categories, images, variations) via Square API
 * 3. Filter items to only those present at the specified location
 * 4. For each item:
 *    - Join category_id → category name from related_objects
 *    - Join image_ids[0] → image URL from related_objects
 *    - Extract variations with formatted prices
 * 5. Group items by category name
 * 6. Sort categories alphabetically
 * 7. Cache for 5 minutes per location
 *
 * Response:
 * {
 *   categories: [
 *     {
 *       category: "Pizza",
 *       categoryId: "CAT123",
 *       items: [
 *         {
 *           id: "ITEM123",
 *           name: "Margherita Pizza",
 *           description: "Classic pizza with...",
 *           category: "Pizza",
 *           image_url: "https://...",
 *           variations: [
 *             { id: "VAR1", name: "Small", priceDollars: 12.50, priceFormatted: "$12.50" }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.get(
  '/',
  validate({ query: catalogQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { location_id } = req.query as { location_id: string };
      const cache = req.app.locals.cache as CacheProvider;
      const squareClient = req.app.locals.squareClient as AxiosInstance;
      const cacheKey = CacheKeys.catalog(location_id);

      // Check cache first
      const cached = await cache.get<CatalogResponse>(cacheKey);
      if (cached) {
        console.info(`[cache] HIT: catalog:${location_id}`);
        return res.json(cached);
      }

      console.info(`[cache] MISS: catalog:${location_id}`);

      // Aggregate all catalog items across all pages
      const allRelatedObjects: SquareCatalogObject[] = [];
      let allItems: SquareCatalogItem[] = [];

      const catalogObjects = await aggregateSquarePages<SquareCatalogObject>(
        async (cursor?: string) => {
          const response = await squareClient.post<SquareSearchCatalogResponse>('/catalog/search', {
            object_types: ['ITEM'],
            include_related_objects: true,
            limit: 100,
            cursor,
          });

          // Accumulate related_objects across all pages
          if (response.data.related_objects) {
            allRelatedObjects.push(...response.data.related_objects);
          }

          return {
            objects: response.data.objects,
            cursor: response.data.cursor,
          };
        },
      );

      // Filter to only ITEM types
      allItems = catalogObjects.filter((obj): obj is SquareCatalogItem => obj.type === 'ITEM');

      // Filter items by location
      const locationItems = filterItemsByLocation(allItems, location_id);

      if (locationItems.length === 0) {
        console.warn(`[catalog] No items found for location ${location_id}`);
        const emptyResult: CatalogResponse = { categories: [] };
        await cache.set(cacheKey, emptyResult, req.app.locals.config.CACHE_TTL_SECONDS);
        return res.json(emptyResult);
      }

      // Group items by category
      const categoryGroups = groupItemsByCategory(locationItems, allRelatedObjects);

      const result: CatalogResponse = { categories: categoryGroups };

      // Cache for 5 minutes
      const ttl = req.app.locals.config.CACHE_TTL_SECONDS;
      await cache.set(cacheKey, result, ttl);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
