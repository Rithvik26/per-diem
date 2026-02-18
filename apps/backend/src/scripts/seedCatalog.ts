import dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';
import axios from 'axios';
import { randomUUID } from 'crypto';

// Load .env
let envPath = join(process.cwd(), '.env');
if (!existsSync(envPath)) {
  envPath = join(process.cwd(), '../../.env');
}
dotenv.config({ path: envPath });

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox';

if (!SQUARE_ACCESS_TOKEN) {
  console.error('Error: SQUARE_ACCESS_TOKEN not found in environment');
  process.exit(1);
}

// Square API configuration
const SQUARE_API_VERSION = '2024-12-18';
const SQUARE_BASE_URL = SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

// Idempotency keys (stable, so script is safe to run multiple times)
const IDEMPOTENCY_PREFIX = 'per-diem-seed-v1';

/**
 * Seed the Square catalog with a complete menu structure
 * Safe to run multiple times - uses idempotency keys
 */
async function seedCatalog() {
  console.log('🌱 Starting catalog seed...\n');

  try {
    // Step 1: Get merchant location
    console.log('📍 Fetching merchant locations...');
    const locationsResponse = await axios.get(`${SQUARE_BASE_URL}/v2/locations`, {
      headers: {
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Square-Version': SQUARE_API_VERSION,
        'Content-Type': 'application/json',
      },
    });

    const location = locationsResponse.data.locations?.[0];

    if (!location) {
      throw new Error('No locations found for this merchant');
    }

    console.log(`✓ Found location: ${location.name} (${location.id})\n`);

    // Step 2: Create categories first
    console.log('📦 Step 1: Creating categories...');

    const categoriesRequest = {
      idempotency_key: `${IDEMPOTENCY_PREFIX}-categories-${randomUUID()}`,
      batches: [
        {
          objects: [
            // CATEGORY: Burgers (leaving category_type unset defaults to REGULAR_CATEGORY)
            {
              type: 'CATEGORY',
              id: '#category-burgers-v2',
              present_at_all_locations: true,
              category_data: {
                name: 'Burgers (API)',
              },
            },

            // CATEGORY: Sides (leaving category_type unset defaults to REGULAR_CATEGORY)
            {
              type: 'CATEGORY',
              id: '#category-sides-v2',
              present_at_all_locations: true,
              category_data: {
                name: 'Sides (API)',
              },
            },

            // CATEGORY: Drinks (leaving category_type unset defaults to REGULAR_CATEGORY)
            {
              type: 'CATEGORY',
              id: '#category-drinks-v2',
              present_at_all_locations: true,
              category_data: {
                name: 'Drinks (API)',
              },
            },
          ],
        },
      ],
    };

    const categoriesResponse = await axios.post(
      `${SQUARE_BASE_URL}/v2/catalog/batch-upsert`,
      categoriesRequest,
      {
        headers: {
          'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          'Square-Version': SQUARE_API_VERSION,
          'Content-Type': 'application/json',
        },
      }
    );

    const categoryMappings = categoriesResponse.data.id_mappings || [];
    const burgersCategoryId = categoryMappings.find((m: any) => m.client_object_id === '#category-burgers-v2')?.object_id;
    const sidesCategoryId = categoryMappings.find((m: any) => m.client_object_id === '#category-sides-v2')?.object_id;
    const drinksCategoryId = categoryMappings.find((m: any) => m.client_object_id === '#category-drinks-v2')?.object_id;

    if (!burgersCategoryId || !sidesCategoryId || !drinksCategoryId) {
      throw new Error('Failed to retrieve category IDs from API response');
    }

    console.log(`✓ Created categories:`);
    console.log(`  Burgers: ${burgersCategoryId}`);
    console.log(`  Sides: ${sidesCategoryId}`);
    console.log(`  Drinks: ${drinksCategoryId}\n`);

    // Step 3: Create items with real category IDs
    console.log('📦 Step 2: Creating items...');

    const itemsRequest = {
      idempotency_key: `${IDEMPOTENCY_PREFIX}-items-${randomUUID()}`,
      batches: [
        {
          objects: [

            // ITEM: Cheeseburger
            {
              type: 'ITEM',
              id: '#item-cheeseburger-v2',
              present_at_all_locations: true,
              item_data: {
                name: 'Cheeseburger',
                description: 'Classic beef patty with melted cheddar, lettuce, tomato, and our special sauce',
                category_id: burgersCategoryId,
                variations: [
                  {
                    type: 'ITEM_VARIATION',
                    id: '#variation-cheeseburger-regular',
                    item_variation_data: {
                      name: 'Regular',
                      pricing_type: 'FIXED_PRICING',
                      price_money: {
                        amount: 1295, // $12.95
                        currency: 'USD',
                      },
                    },
                  },
                ],
              },
            },

            // ITEM: Veggie Burger
            {
              type: 'ITEM',
              id: '#item-veggie-burger-v2',
              present_at_all_locations: true,
              item_data: {
                name: 'Veggie Burger',
                description: 'Plant-based patty with avocado, sprouts, and chipotle mayo',
                category_id: burgersCategoryId,
                variations: [
                  {
                    type: 'ITEM_VARIATION',
                    id: '#variation-veggie-burger-regular',
                    item_variation_data: {
                      name: 'Regular',
                      pricing_type: 'FIXED_PRICING',
                      price_money: {
                        amount: 1395, // $13.95
                        currency: 'USD',
                      },
                    },
                  },
                ],
              },
            },

            // ITEM: French Fries
            {
              type: 'ITEM',
              id: '#item-fries-v2',
              present_at_all_locations: true,
              item_data: {
                name: 'French Fries',
                description: 'Crispy golden fries with sea salt',
                category_id: sidesCategoryId,
                variations: [
                  {
                    type: 'ITEM_VARIATION',
                    id: '#variation-fries-small',
                    item_variation_data: {
                      name: 'Small',
                      pricing_type: 'FIXED_PRICING',
                      price_money: {
                        amount: 495, // $4.95
                        currency: 'USD',
                      },
                    },
                  },
                  {
                    type: 'ITEM_VARIATION',
                    id: '#variation-fries-large',
                    item_variation_data: {
                      name: 'Large',
                      pricing_type: 'FIXED_PRICING',
                      price_money: {
                        amount: 695, // $6.95
                        currency: 'USD',
                      },
                    },
                  },
                ],
              },
            },

            // ITEM: Coca-Cola
            {
              type: 'ITEM',
              id: '#item-coke-v2',
              present_at_all_locations: true,
              item_data: {
                name: 'Coca-Cola',
                description: 'Ice-cold classic Coke',
                category_id: drinksCategoryId,
                variations: [
                  {
                    type: 'ITEM_VARIATION',
                    id: '#variation-coke-small',
                    item_variation_data: {
                      name: 'Small',
                      pricing_type: 'FIXED_PRICING',
                      price_money: {
                        amount: 295, // $2.95
                        currency: 'USD',
                      },
                    },
                  },
                  {
                    type: 'ITEM_VARIATION',
                    id: '#variation-coke-large',
                    item_variation_data: {
                      name: 'Large',
                      pricing_type: 'FIXED_PRICING',
                      price_money: {
                        amount: 395, // $3.95
                        currency: 'USD',
                      },
                    },
                  },
                ],
              },
            },

            // ITEM: Lemonade
            {
              type: 'ITEM',
              id: '#item-lemonade-v2',
              present_at_all_locations: true,
              item_data: {
                name: 'Fresh Lemonade',
                description: 'Homemade lemonade with real lemons',
                category_id: drinksCategoryId,
                variations: [
                  {
                    type: 'ITEM_VARIATION',
                    id: '#variation-lemonade-regular',
                    item_variation_data: {
                      name: 'Regular',
                      pricing_type: 'FIXED_PRICING',
                      price_money: {
                        amount: 395, // $3.95
                        currency: 'USD',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const itemsResponse = await axios.post(
      `${SQUARE_BASE_URL}/v2/catalog/batch-upsert`,
      itemsRequest,
      {
        headers: {
          'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          'Square-Version': SQUARE_API_VERSION,
          'Content-Type': 'application/json',
        },
      }
    );

    const itemMappings = itemsResponse.data.id_mappings || [];

    console.log(`✓ Created ${itemMappings.length} items:\n`);

    // Display created objects grouped by category
    const burgerItems = itemMappings.filter((m: any) =>
      ['#item-cheeseburger-v2', '#item-veggie-burger-v2'].includes(m.client_object_id)
    );
    console.log(`  Burgers (${burgerItems.length} items):`);
    burgerItems.forEach((item: any) => {
      const name = item.client_object_id?.replace('#item-', '').replace(/-v2$/, '').replace(/-/g, ' ');
      console.log(`    ${item.object_id} - ${name}`);
    });

    const sideItems = itemMappings.filter((m: any) =>
      m.client_object_id === '#item-fries-v2'
    );
    console.log(`\n  Sides (${sideItems.length} items):`);
    sideItems.forEach((item: any) => {
      const name = item.client_object_id?.replace('#item-', '').replace(/-v2$/, '').replace(/-/g, ' ');
      console.log(`    ${item.object_id} - ${name}`);
    });

    const drinkItems = itemMappings.filter((m: any) =>
      ['#item-coke-v2', '#item-lemonade-v2'].includes(m.client_object_id)
    );
    console.log(`\n  Drinks (${drinkItems.length} items):`);
    drinkItems.forEach((item: any) => {
      const name = item.client_object_id?.replace('#item-', '').replace(/-v2$/, '').replace(/-/g, ' ');
      console.log(`    ${item.object_id} - ${name}`);
    });

    console.log('\n✅ Catalog seed complete!');
    console.log('\nYou can now:');
    console.log('  1. Restart your backend server');
    console.log('  2. Call GET /api/catalog/categories?location_id=' + location.id);
    console.log('  3. Call GET /api/catalog?location_id=' + location.id);
    console.log('  4. See items properly grouped by category!\n');
  } catch (error: any) {
    console.error('❌ Error seeding catalog:', error.message);
    if (error.response) {
      console.error('API Error Details:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.errors) {
      console.error('Details:', JSON.stringify(error.errors, null, 2));
    }
    process.exit(1);
  }
}

// Run the seed script
seedCatalog();
