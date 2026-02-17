import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { AxiosInstance } from 'axios';
import type { SquareSearchCatalogResponse } from '@per-diem/shared-types';
import { createSquareClient } from '../../services/square-client.service.js';
import { MemoryCacheProvider } from '../../services/cache.service.js';
import { aggregateSquarePages } from '../../utils/pagination.js';
import {
  filterItemsByLocation,
  groupItemsByCategory,
  transformCatalogItem,
  formatPrice,
} from '../../transformers/square-catalog.transformer.js';

const SQUARE_BASE_URL = 'https://connect.squareupsandbox.com';

// Mock full catalog response with items, categories, and images
const mockFullCatalogResponse: SquareSearchCatalogResponse = {
  objects: [
    {
      type: 'ITEM',
      id: 'ITEM_PIZZA_1',
      present_at_location_ids: ['LOC1'],
      item_data: {
        name: 'Margherita Pizza',
        description: 'Classic Italian pizza with fresh mozzarella',
        category_id: 'CAT_PIZZA',
        image_ids: ['IMG_PIZZA_1'],
        variations: [
          {
            type: 'ITEM_VARIATION',
            id: 'VAR_PIZZA_SMALL',
            item_variation_data: {
              name: 'Small',
              pricing_type: 'FIXED_PRICING',
              price_money: {
                amount: 1250, // $12.50
                currency: 'USD',
              },
            },
          },
          {
            type: 'ITEM_VARIATION',
            id: 'VAR_PIZZA_LARGE',
            item_variation_data: {
              name: 'Large',
              pricing_type: 'FIXED_PRICING',
              price_money: {
                amount: 1850, // $18.50
                currency: 'USD',
              },
            },
          },
        ],
      },
    },
    {
      type: 'ITEM',
      id: 'ITEM_BURGER_1',
      present_at_all_locations: true,
      item_data: {
        name: 'Cheeseburger',
        description: 'Juicy beef patty with cheese',
        category_id: 'CAT_BURGERS',
        variations: [
          {
            type: 'ITEM_VARIATION',
            id: 'VAR_BURGER_REG',
            item_variation_data: {
              name: 'Regular',
              pricing_type: 'FIXED_PRICING',
              price_money: {
                amount: 995, // $9.95
                currency: 'USD',
              },
            },
          },
        ],
      },
    },
  ],
  related_objects: [
    {
      type: 'CATEGORY',
      id: 'CAT_PIZZA',
      category_data: {
        name: 'Pizza',
      },
    },
    {
      type: 'CATEGORY',
      id: 'CAT_BURGERS',
      category_data: {
        name: 'Burgers',
      },
    },
    {
      type: 'IMAGE',
      id: 'IMG_PIZZA_1',
      image_data: {
        url: 'https://example.com/images/pizza.jpg',
        caption: 'Margherita Pizza',
      },
    },
  ],
};

const server = setupServer(
  http.post(`${SQUARE_BASE_URL}/v2/catalog/search`, () => {
    return HttpResponse.json(mockFullCatalogResponse);
  }),
);

describe('Catalog Integration', () => {
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

  describe('Price formatting', () => {
    it('formats cents to dollar string', () => {
      expect(formatPrice(1250)).toBe('$12.50');
      expect(formatPrice(995)).toBe('$9.95');
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(10050)).toBe('$100.50');
    });
  });

  describe('Item transformation', () => {
    it('transforms a complete catalog item', () => {
      const item = mockFullCatalogResponse.objects![0] as any;
      const relatedObjects = mockFullCatalogResponse.related_objects!;

      const transformed = transformCatalogItem(item, relatedObjects);

      expect(transformed).toEqual({
        id: 'ITEM_PIZZA_1',
        name: 'Margherita Pizza',
        description: 'Classic Italian pizza with fresh mozzarella',
        category: 'Pizza',
        image_url: 'https://example.com/images/pizza.jpg',
        variations: [
          {
            id: 'VAR_PIZZA_SMALL',
            name: 'Small',
            priceDollars: 12.5,
            priceFormatted: '$12.50',
          },
          {
            id: 'VAR_PIZZA_LARGE',
            name: 'Large',
            priceDollars: 18.5,
            priceFormatted: '$18.50',
          },
        ],
      });
    });

    it('handles items without images', () => {
      const item = mockFullCatalogResponse.objects![1] as any;
      const relatedObjects = mockFullCatalogResponse.related_objects!;

      const transformed = transformCatalogItem(item, relatedObjects);

      expect(transformed.image_url).toBeUndefined();
    });

    it('handles items without categories', () => {
      const item = {
        type: 'ITEM',
        id: 'ITEM_NO_CAT',
        item_data: {
          name: 'Mystery Item',
          variations: [],
        },
      } as any;

      const transformed = transformCatalogItem(item, []);

      expect(transformed.category).toBe('Uncategorized');
    });
  });

  describe('Grouping by category', () => {
    it('groups items by category name', () => {
      const items = mockFullCatalogResponse.objects!.filter((obj) => obj.type === 'ITEM') as any[];
      const relatedObjects = mockFullCatalogResponse.related_objects!;

      const groups = groupItemsByCategory(items, relatedObjects);

      expect(groups).toHaveLength(2);
      expect(groups[0].category).toBe('Burgers');
      expect(groups[0].items).toHaveLength(1);
      expect(groups[1].category).toBe('Pizza');
      expect(groups[1].items).toHaveLength(1);
    });

    it('sorts categories alphabetically', () => {
      const items = mockFullCatalogResponse.objects!.filter((obj) => obj.type === 'ITEM') as any[];
      const relatedObjects = mockFullCatalogResponse.related_objects!;

      const groups = groupItemsByCategory(items, relatedObjects);

      const categoryNames = groups.map((g) => g.category);
      expect(categoryNames).toEqual(['Burgers', 'Pizza']);
    });

    it('includes category IDs', () => {
      const items = mockFullCatalogResponse.objects!.filter((obj) => obj.type === 'ITEM') as any[];
      const relatedObjects = mockFullCatalogResponse.related_objects!;

      const groups = groupItemsByCategory(items, relatedObjects);

      expect(groups[0].categoryId).toBe('CAT_BURGERS');
      expect(groups[1].categoryId).toBe('CAT_PIZZA');
    });
  });

  describe('Location filtering with full catalog', () => {
    it('includes items present at specific location', () => {
      const items = mockFullCatalogResponse.objects!.filter((obj) => obj.type === 'ITEM') as any[];
      const filtered = filterItemsByLocation(items, 'LOC1');

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toContain('ITEM_PIZZA_1');
      expect(filtered.map((i) => i.id)).toContain('ITEM_BURGER_1');
    });

    it('excludes items not at location', () => {
      const items = mockFullCatalogResponse.objects!.filter((obj) => obj.type === 'ITEM') as any[];
      const filtered = filterItemsByLocation(items, 'LOC_OTHER');

      expect(filtered).toHaveLength(1); // Only the item with present_at_all_locations
      expect(filtered[0].id).toBe('ITEM_BURGER_1');
    });
  });

  describe('End-to-end catalog fetch', () => {
    it('fetches and transforms full catalog', async () => {
      const allRelatedObjects: any[] = [];

      const catalogObjects = await aggregateSquarePages(async (cursor?: string) => {
        const response = await squareClient.post<SquareSearchCatalogResponse>('/catalog/search', {
          object_types: ['ITEM'],
          include_related_objects: true,
          cursor,
        });

        if (response.data.related_objects) {
          allRelatedObjects.push(...response.data.related_objects);
        }

        return {
          objects: response.data.objects,
          cursor: response.data.cursor,
        };
      });

      const items = catalogObjects.filter((obj: any) => obj.type === 'ITEM');
      const locationItems = filterItemsByLocation(items as any, 'LOC1');
      const groups = groupItemsByCategory(locationItems as any, allRelatedObjects);

      expect(groups).toHaveLength(2);
      expect(groups[0].items[0].variations).toBeDefined();
      expect(groups[1].items[0].image_url).toBe('https://example.com/images/pizza.jpg');
    });
  });
});
