import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { AxiosInstance } from 'axios';
import type { SquareSearchCatalogResponse, SquareCatalogItem } from '@per-diem/shared-types';
import { createSquareClient } from '../../services/square-client.service.js';
import { MemoryCacheProvider } from '../../services/cache.service.js';
import { aggregateSquarePages } from '../../utils/pagination.js';
import {
  filterItemsByLocation,
  extractCategoriesFromRelatedObjects,
} from '../../transformers/square-catalog.transformer.js';

const SQUARE_BASE_URL = 'https://connect.squareupsandbox.com';

// Mock catalog response with pagination
const mockCatalogPage1: SquareSearchCatalogResponse = {
  objects: [
    {
      type: 'ITEM',
      id: 'ITEM1',
      present_at_location_ids: ['LOC1'],
      item_data: {
        name: 'Coffee',
        description: 'Fresh brewed coffee',
        category_id: 'CAT1',
      },
    },
    {
      type: 'ITEM',
      id: 'ITEM2',
      present_at_location_ids: ['LOC1'],
      item_data: {
        name: 'Tea',
        category_id: 'CAT1',
      },
    },
  ],
  related_objects: [
    {
      type: 'CATEGORY',
      id: 'CAT1',
      category_data: {
        name: 'Beverages',
      },
    },
  ],
  cursor: 'next-page-cursor',
};

const mockCatalogPage2: SquareSearchCatalogResponse = {
  objects: [
    {
      type: 'ITEM',
      id: 'ITEM3',
      present_at_all_locations: true,
      item_data: {
        name: 'Cookie',
        category_id: 'CAT2',
      },
    },
  ],
  related_objects: [
    {
      type: 'CATEGORY',
      id: 'CAT2',
      category_data: {
        name: 'Desserts',
      },
    },
  ],
};

const server = setupServer(
  http.post(`${SQUARE_BASE_URL}/v2/catalog/search`, async ({ request }) => {
    const body = (await request.json()) as { cursor?: string };
    if (body.cursor === 'next-page-cursor') {
      return HttpResponse.json(mockCatalogPage2);
    }
    return HttpResponse.json(mockCatalogPage1);
  }),
);

describe('Categories Integration', () => {
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

  it('aggregates catalog items across multiple pages', async () => {
    const allObjects = await aggregateSquarePages(async (cursor?: string) => {
      const response = await squareClient.post<SquareSearchCatalogResponse>('/catalog/search', {
        object_types: ['ITEM'],
        include_related_objects: true,
        cursor,
      });
      return {
        objects: response.data.objects,
        cursor: response.data.cursor,
      };
    });

    expect(allObjects).toHaveLength(3);
  });

  it('filters items by location', () => {
    const items: SquareCatalogItem[] = [
      {
        type: 'ITEM',
        id: 'ITEM1',
        present_at_location_ids: ['LOC1'],
        item_data: { name: 'Item 1' },
      },
      {
        type: 'ITEM',
        id: 'ITEM2',
        present_at_location_ids: ['LOC2'],
        item_data: { name: 'Item 2' },
      },
      {
        type: 'ITEM',
        id: 'ITEM3',
        present_at_all_locations: true,
        item_data: { name: 'Item 3' },
      },
    ];

    const filtered = filterItemsByLocation(items, 'LOC1');
    expect(filtered).toHaveLength(2);
    expect(filtered.map((i) => i.id)).toEqual(['ITEM1', 'ITEM3']);
  });

  it('extracts categories and counts items', () => {
    const items: SquareCatalogItem[] = [
      {
        type: 'ITEM',
        id: 'ITEM1',
        item_data: { name: 'Coffee', category_id: 'CAT1' },
      },
      {
        type: 'ITEM',
        id: 'ITEM2',
        item_data: { name: 'Tea', category_id: 'CAT1' },
      },
      {
        type: 'ITEM',
        id: 'ITEM3',
        item_data: { name: 'Cookie', category_id: 'CAT2' },
      },
    ];

    const relatedObjects = [
      {
        type: 'CATEGORY' as const,
        id: 'CAT1',
        category_data: { name: 'Beverages' },
      },
      {
        type: 'CATEGORY' as const,
        id: 'CAT2',
        category_data: { name: 'Desserts' },
      },
    ];

    const categories = extractCategoriesFromRelatedObjects(relatedObjects, items);

    expect(categories).toHaveLength(2);
    expect(categories[0]).toEqual({ id: 'CAT1', name: 'Beverages', item_count: 2 });
    expect(categories[1]).toEqual({ id: 'CAT2', name: 'Desserts', item_count: 1 });
  });

  it('sorts categories alphabetically', () => {
    const items: SquareCatalogItem[] = [
      { type: 'ITEM', id: 'ITEM1', item_data: { name: 'Item', category_id: 'CAT_Z' } },
      { type: 'ITEM', id: 'ITEM2', item_data: { name: 'Item', category_id: 'CAT_A' } },
    ];

    const relatedObjects = [
      { type: 'CATEGORY' as const, id: 'CAT_Z', category_data: { name: 'Zebra' } },
      { type: 'CATEGORY' as const, id: 'CAT_A', category_data: { name: 'Apple' } },
    ];

    const categories = extractCategoriesFromRelatedObjects(relatedObjects, items);

    expect(categories[0].name).toBe('Apple');
    expect(categories[1].name).toBe('Zebra');
  });

  it('handles missing category in related_objects', () => {
    const items: SquareCatalogItem[] = [
      { type: 'ITEM', id: 'ITEM1', item_data: { name: 'Item', category_id: 'MISSING_CAT' } },
    ];

    const categories = extractCategoriesFromRelatedObjects([], items);

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Unknown Category');
  });
});
