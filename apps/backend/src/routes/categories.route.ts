import { Router, type Request, type Response, type NextFunction } from 'express';
import type { AxiosInstance } from 'axios';
import { z } from 'zod';
import type {
  SquareSearchCatalogResponse,
  SquareCatalogObject,
  SquareCatalogItem,
  CategoriesResponse,
} from '@per-diem/shared-types';
import type { CacheProvider } from '../services/cache.service.js';
import { CacheKeys } from '../services/cache.service.js';
import { validate } from '../middleware/validation.middleware.js';
import { aggregateSquarePages } from '../utils/pagination.js';
import {
  extractCategoriesFromRelatedObjects,
  filterItemsByLocation,
} from '../transformers/square-catalog.transformer.js';

const router = Router();

// Validation schema for query parameters
const categoriesQuerySchema = z.object({
  location_id: z.string().min(1, 'location_id is required'),
});

/**
 * GET /api/catalog/categories?location_id=<ID>
 *
 * Returns categories that have items at the specified location.
 * - Validates location_id query param
 * - Fetches all catalog items from Square (with pagination)
 * - Filters items by location presence
 * - Extracts categories from related_objects
 * - Counts items per category
 * - Caches per location_id for 5 minutes
 */
router.get(
  '/',
  validate({ query: categoriesQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { location_id } = req.query as { location_id: string };
      const cache = req.app.locals.cache as CacheProvider;
      const squareClient = req.app.locals.squareClient as AxiosInstance;
      const cacheKey = CacheKeys.categories(location_id);

      // Check cache first
      const cached = await cache.get<CategoriesResponse>(cacheKey);
      if (cached) {
        console.info(`[cache] HIT: categories:${location_id}`);
        return res.json(cached);
      }

      console.info(`[cache] MISS: categories:${location_id}`);

      // Aggregate all pages from Square SearchCatalogObjects
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

          // Accumulate related_objects across pages
          if (response.data.related_objects) {
            allRelatedObjects.push(...response.data.related_objects);
          }

          return {
            objects: response.data.objects,
            cursor: response.data.cursor,
          };
        },
      );

      // Filter to only ITEM types (TypeScript narrowing)
      allItems = catalogObjects.filter((obj): obj is SquareCatalogItem => obj.type === 'ITEM');

      // Filter items by location
      const locationItems = filterItemsByLocation(allItems, location_id);

      if (locationItems.length === 0) {
        console.warn(`[categories] No items found for location ${location_id}`);
        const emptyResult: CategoriesResponse = { categories: [] };
        await cache.set(cacheKey, emptyResult, req.app.locals.config.CACHE_TTL_SECONDS);
        return res.json(emptyResult);
      }

      // Extract categories from related_objects
      const categories = extractCategoriesFromRelatedObjects(allRelatedObjects, locationItems);

      const result: CategoriesResponse = { categories };

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
