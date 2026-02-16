import { Router, type Request, type Response, type NextFunction } from 'express';
import type { AxiosInstance } from 'axios';
import type {
  SquareListLocationsResponse,
  SquareLocation,
  LocationsResponse,
} from '@per-diem/shared-types';
import type { CacheProvider } from '../services/cache.service.js';
import { CacheKeys } from '../services/cache.service.js';
import { transformSquareLocation } from '../transformers/square-location.transformer.js';
import { AppError } from '../utils/app-error.js';

const router = Router();

/**
 * GET /api/locations
 *
 * Returns all ACTIVE locations from Square.
 * - Calls Square List Locations API
 * - Filters to only ACTIVE status
 * - Transforms to simplified Location type
 * - Caches for 5 minutes
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cache = req.app.locals.cache as CacheProvider;
    const squareClient = req.app.locals.squareClient as AxiosInstance;
    const cacheKey = CacheKeys.locations();

    // Check cache first
    const cached = await cache.get<LocationsResponse>(cacheKey);
    if (cached) {
      console.info('[cache] HIT: locations');
      return res.json(cached);
    }

    console.info('[cache] MISS: locations');

    // Fetch from Square API
    const response = await squareClient.get<SquareListLocationsResponse>('/locations');

    if (!response.data.locations) {
      throw AppError.upstream('Square API returned no locations');
    }

    // Filter to ACTIVE only and transform
    const activeLocations = response.data.locations
      .filter((loc: SquareLocation) => loc.status === 'ACTIVE')
      .map(transformSquareLocation);

    const result: LocationsResponse = {
      locations: activeLocations,
    };

    // Cache for 5 minutes
    const ttl = req.app.locals.config.CACHE_TTL_SECONDS;
    await cache.set(cacheKey, result, ttl);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
