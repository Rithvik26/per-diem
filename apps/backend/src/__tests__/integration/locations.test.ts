import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { AxiosInstance } from 'axios';
import type { SquareListLocationsResponse } from '@per-diem/shared-types';
import { createSquareClient } from '../../services/square-client.service.js';
import { MemoryCacheProvider } from '../../services/cache.service.js';

const SQUARE_BASE_URL = 'https://connect.squareupsandbox.com';

// Mock Square API responses
const mockLocationsResponse: SquareListLocationsResponse = {
  locations: [
    {
      id: 'LOC1',
      name: 'Default Test Account',
      address: {
        address_line_1: '123 Main St',
        locality: 'San Francisco',
        administrative_district_level_1: 'CA',
        postal_code: '94102',
      },
      timezone: 'America/Los_Angeles',
      status: 'ACTIVE',
    },
    {
      id: 'LOC2',
      name: 'Inactive Location',
      address: {
        address_line_1: '456 Oak Ave',
        locality: 'Portland',
        administrative_district_level_1: 'OR',
        postal_code: '97201',
      },
      timezone: 'America/Los_Angeles',
      status: 'INACTIVE',
    },
  ],
};

const server = setupServer(
  http.get(`${SQUARE_BASE_URL}/v2/locations`, () => {
    return HttpResponse.json(mockLocationsResponse);
  }),
);

describe('Locations Integration', () => {
  let squareClient: AxiosInstance;
  let cache: MemoryCacheProvider;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    squareClient = createSquareClient(SQUARE_BASE_URL, 'test-token');
    cache = new MemoryCacheProvider(300);
  });

  afterEach(() => {
    server.resetHandlers();
    cache.clear();
  });

  afterAll(() => {
    server.close();
  });

  it('fetches locations from Square API', async () => {
    const response = await squareClient.get<SquareListLocationsResponse>('/locations');
    expect(response.data.locations).toHaveLength(2);
    expect(response.data.locations?.[0].id).toBe('LOC1');
  });

  it('filters to only ACTIVE locations', async () => {
    const response = await squareClient.get<SquareListLocationsResponse>('/locations');
    const activeLocations = response.data.locations?.filter((loc) => loc.status === 'ACTIVE');
    expect(activeLocations).toHaveLength(1);
    expect(activeLocations?.[0].name).toBe('Default Test Account');
  });

  it('caches location response', async () => {
    const cacheKey = 'locations';
    const data = { locations: [{ id: 'test', name: 'test', address: {}, timezone: 'UTC', status: 'ACTIVE' as const }] };

    await cache.set(cacheKey, data, 300);
    const cached = await cache.get(cacheKey);

    expect(cached).toEqual(data);
  });

  it('handles Square API errors gracefully', async () => {
    server.use(
      http.get(`${SQUARE_BASE_URL}/v2/locations`, () => {
        return HttpResponse.json({ errors: [{ code: 'UNAUTHORIZED' }] }, { status: 401 });
      }),
    );

    await expect(squareClient.get('/locations')).rejects.toThrow();
  });
});
