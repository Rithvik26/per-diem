/**
 * Aggregates paginated responses from Square API into a single array.
 *
 * Square APIs return paginated results with a cursor field. This utility
 * automatically follows cursors until all pages are fetched.
 *
 * @param fetcher - Async function that accepts an optional cursor and returns
 *                  objects array and optional next cursor
 * @returns All objects from all pages merged into a single array
 *
 * @example
 * const allItems = await aggregateSquarePages(async (cursor) => {
 *   const response = await squareClient.post('/catalog/search', { cursor });
 *   return { objects: response.data.objects, cursor: response.data.cursor };
 * });
 */
export async function aggregateSquarePages<T>(
  fetcher: (cursor?: string) => Promise<{ objects?: T[]; cursor?: string }>,
): Promise<T[]> {
  const allObjects: T[] = [];
  let cursor: string | undefined;
  let pageNumber = 1;
  const MAX_PAGES = 10; // Safety limit to prevent infinite loops

  do {
    try {
      const result = await fetcher(cursor);

      const objects = result.objects ?? [];
      allObjects.push(...objects);

      console.info(
        `[pagination] Fetched page ${pageNumber} with ${objects.length} items${
          result.cursor ? `, cursor: ${result.cursor.substring(0, 12)}...` : ' (final page)'
        }`,
      );

      cursor = result.cursor;
      pageNumber++;

      if (pageNumber > MAX_PAGES) {
        console.warn(`[pagination] Reached max page limit (${MAX_PAGES}), stopping`);
        break;
      }
    } catch (error) {
      console.error(`[pagination] Error fetching page ${pageNumber}:`, error);
      throw error;
    }
  } while (cursor);

  console.info(`[pagination] Aggregation complete: ${allObjects.length} total items across ${pageNumber - 1} pages`);
  return allObjects;
}
