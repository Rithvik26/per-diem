import type {
  SquareCatalogObject,
  SquareCatalogItem,
  SquareCatalogCategory,
  SquareCatalogImage,
  Category,
  MenuItem,
  MenuItemVariation,
  CategoryGroup,
} from '@per-diem/shared-types';

/**
 * Extracts unique categories from Square's related_objects array and counts items per category.
 *
 * Square Catalog API structure:
 * - `objects` array contains ITEM objects with `item_data.category_id` references
 * - `related_objects` array contains CATEGORY objects with full category details
 *
 * This transformer:
 * 1. Filters related_objects to only CATEGORY types
 * 2. Builds a Map<categoryId, categoryName> for fast lookup
 * 3. Counts how many items reference each category
 * 4. Returns categories sorted alphabetically by name
 *
 * @param relatedObjects - Square API related_objects array (contains categories, images, variations)
 * @param items - Filtered catalog items (already scoped to location)
 * @returns Array of categories with item counts, sorted by name
 */
export function extractCategoriesFromRelatedObjects(
  relatedObjects: SquareCatalogObject[],
  items: SquareCatalogItem[],
): Category[] {
  // Step 1: Build category lookup map from related_objects
  const categoryMap = new Map<string, string>();

  for (const obj of relatedObjects) {
    if (obj.type === 'CATEGORY') {
      const category = obj as SquareCatalogCategory;
      // Filter for REGULAR_CATEGORY only to avoid duplicates from menu system
      // See: https://developer.squareup.com/docs/catalog-api/categorize-catalog-items
      if (!category.category_data.category_type || category.category_data.category_type === 'REGULAR_CATEGORY') {
        categoryMap.set(category.id, category.category_data.name);
      }
    }
  }

  // Step 2: Count items per category
  const categoryCounts = new Map<string, number>();

  for (const item of items) {
    const categoryId = item.item_data.category_id;
    if (categoryId) {
      categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
    }
  }

  // Step 3: Build final category array
  const categories: Category[] = [];

  for (const [categoryId, count] of categoryCounts.entries()) {
    const name = categoryMap.get(categoryId);
    if (name) {
      categories.push({
        id: categoryId,
        name,
        item_count: count,
      });
    } else {
      // Category referenced but not in related_objects — log warning but include it
      console.warn(`[transformer] Category ${categoryId} referenced but not found in related_objects`);
      categories.push({
        id: categoryId,
        name: 'Unknown Category',
        item_count: count,
      });
    }
  }

  // Step 4: Sort alphabetically by name
  categories.sort((a, b) => a.name.localeCompare(b.name));

  return categories;
}

/**
 * Finds a category name by ID in the related_objects array.
 *
 * @param categoryId - Square category ID
 * @param relatedObjects - Square API related_objects array
 * @returns Category name, or null if not found
 */
export function findCategoryName(
  categoryId: string,
  relatedObjects: SquareCatalogObject[],
): string | null {
  for (const obj of relatedObjects) {
    if (obj.type === 'CATEGORY' && obj.id === categoryId) {
      const category = obj as SquareCatalogCategory;
      // Filter for REGULAR_CATEGORY only to avoid duplicates from menu system
      if (!category.category_data.category_type || category.category_data.category_type === 'REGULAR_CATEGORY') {
        return category.category_data.name;
      }
    }
  }
  return null;
}

/**
 * Filters catalog items to only those present at a specific location.
 *
 * An item is considered present at a location if:
 * - `present_at_all_locations` is true, OR
 * - `present_at_location_ids` array includes the location ID
 *
 * @param items - All catalog items from Square API
 * @param locationId - Square location ID to filter by
 * @returns Items available at the specified location
 */
export function filterItemsByLocation(
  items: SquareCatalogItem[],
  locationId: string,
): SquareCatalogItem[] {
  return items.filter((item) => {
    return (
      item.present_at_all_locations === true ||
      item.present_at_location_ids?.includes(locationId)
    );
  });
}

/**
 * Finds an image URL by ID in the related_objects array.
 *
 * @param imageId - Square image ID
 * @param relatedObjects - Square API related_objects array
 * @returns Image URL, or null if not found
 */
export function findImageUrl(
  imageId: string,
  relatedObjects: SquareCatalogObject[],
): string | null {
  for (const obj of relatedObjects) {
    if (obj.type === 'IMAGE' && obj.id === imageId) {
      return (obj as SquareCatalogImage).image_data.url;
    }
  }
  return null;
}

/**
 * Formats a Square Money amount (in cents) as a USD string.
 *
 * @param cents - Amount in cents
 * @returns Formatted price string (e.g., "$12.50")
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Transforms a Square catalog item into a simplified MenuItem.
 *
 * Joins related_objects to resolve:
 * - Category name (via category_id)
 * - Image URL (via image_ids[0])
 * - Variations with formatted prices
 *
 * @param item - Square CatalogItem
 * @param relatedObjects - Square API related_objects array
 * @returns Transformed MenuItem
 */
export function transformCatalogItem(
  item: SquareCatalogItem,
  relatedObjects: SquareCatalogObject[],
): MenuItem {
  // Resolve category name
  const categoryName = item.item_data.category_id
    ? findCategoryName(item.item_data.category_id, relatedObjects) ?? 'Uncategorized'
    : 'Uncategorized';

  // Resolve image URL (use first image if multiple exist)
  const imageUrl = item.item_data.image_ids?.[0]
    ? findImageUrl(item.item_data.image_ids[0], relatedObjects)
    : null;

  // Transform variations
  const variations: MenuItemVariation[] = (item.item_data.variations ?? []).map((v) => ({
    id: v.id,
    name: v.item_variation_data.name,
    priceDollars: (v.item_variation_data.price_money?.amount ?? 0) / 100,
    priceFormatted: formatPrice(v.item_variation_data.price_money?.amount ?? 0),
  }));

  return {
    id: item.id,
    name: item.item_data.name,
    description: item.item_data.description,
    category: categoryName,
    image_url: imageUrl ?? undefined,
    variations,
  };
}

/**
 * Groups menu items by category name.
 *
 * This is the final transformation for the GET /api/catalog endpoint.
 *
 * Process:
 * 1. Transform all Square CatalogItems to MenuItems (joining related_objects)
 * 2. Group MenuItems by their category name
 * 3. Build CategoryGroup array with category name + items
 * 4. Sort categories alphabetically
 *
 * @param items - Filtered Square catalog items (already scoped to location)
 * @param relatedObjects - Square API related_objects array
 * @returns Array of CategoryGroup objects sorted by category name
 */
export function groupItemsByCategory(
  items: SquareCatalogItem[],
  relatedObjects: SquareCatalogObject[],
): CategoryGroup[] {
  // Transform all items
  const menuItems = items.map((item) => transformCatalogItem(item, relatedObjects));

  // Group by category
  const categoryMap = new Map<string, MenuItem[]>();

  for (const item of menuItems) {
    const existing = categoryMap.get(item.category) ?? [];
    existing.push(item);
    categoryMap.set(item.category, existing);
  }

  // Build CategoryGroup array with category IDs
  const categoryGroups: CategoryGroup[] = [];

  for (const [categoryName, items] of categoryMap.entries()) {
    // Find category ID from related_objects (REGULAR_CATEGORY only)
    let categoryId = '';
    for (const obj of relatedObjects) {
      if (obj.type === 'CATEGORY') {
        const category = obj as SquareCatalogCategory;
        // Filter for REGULAR_CATEGORY only to avoid duplicates from menu system
        if ((!category.category_data.category_type || category.category_data.category_type === 'REGULAR_CATEGORY')
            && category.category_data.name === categoryName) {
          categoryId = obj.id;
          break;
        }
      }
    }

    categoryGroups.push({
      category: categoryName,
      categoryId: categoryId || 'uncategorized',
      items,
    });
  }

  // Sort alphabetically by category name
  categoryGroups.sort((a, b) => a.category.localeCompare(b.category));

  return categoryGroups;
}
