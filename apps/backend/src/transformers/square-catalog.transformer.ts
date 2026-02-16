import type {
  SquareCatalogObject,
  SquareCatalogItem,
  SquareCatalogCategory,
  Category,
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
      categoryMap.set(category.id, category.category_data.name);
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
      return (obj as SquareCatalogCategory).category_data.name;
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
