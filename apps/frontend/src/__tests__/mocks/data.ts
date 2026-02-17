import type { Location, Category, CategoryGroup } from '@per-diem/shared-types';

export const mockLocations: Location[] = [
  {
    id: 'LOC1',
    name: 'Downtown Restaurant',
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
    name: 'Uptown Cafe',
    address: {
      address_line_1: '456 Market St',
      locality: 'Oakland',
      administrative_district_level_1: 'CA',
      postal_code: '94607',
    },
    timezone: 'America/Los_Angeles',
    status: 'ACTIVE',
  },
];

export const mockCategories: Category[] = [
  {
    id: 'CAT_PIZZA',
    name: 'Pizza',
    item_count: 2,
  },
  {
    id: 'CAT_BURGERS',
    name: 'Burgers',
    item_count: 1,
  },
];

export const mockCatalog: CategoryGroup[] = [
  {
    category: 'Pizza',
    categoryId: 'CAT_PIZZA',
    items: [
      {
        id: 'ITEM1',
        name: 'Margherita Pizza',
        description: 'Classic Italian pizza with fresh mozzarella and basil',
        category: 'Pizza',
        image_url: 'https://example.com/pizza.jpg',
        variations: [
          {
            id: 'VAR1',
            name: 'Small',
            priceDollars: 12.5,
            priceFormatted: '$12.50',
          },
          {
            id: 'VAR2',
            name: 'Large',
            priceDollars: 18.5,
            priceFormatted: '$18.50',
          },
        ],
      },
      {
        id: 'ITEM2',
        name: 'Pepperoni Pizza',
        description: 'Loaded with pepperoni and extra cheese',
        category: 'Pizza',
        variations: [
          {
            id: 'VAR3',
            name: 'Regular',
            priceDollars: 14.99,
            priceFormatted: '$14.99',
          },
        ],
      },
    ],
  },
  {
    category: 'Burgers',
    categoryId: 'CAT_BURGERS',
    items: [
      {
        id: 'ITEM3',
        name: 'Cheeseburger',
        description: 'Juicy beef patty with cheese',
        category: 'Burgers',
        image_url: 'https://example.com/burger.jpg',
        variations: [
          {
            id: 'VAR4',
            name: 'Regular',
            priceDollars: 9.95,
            priceFormatted: '$9.95',
          },
        ],
      },
    ],
  },
];
