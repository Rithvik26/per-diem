import type { SquareLocation, Location } from '@per-diem/shared-types';

/**
 * Transforms a Square Location API response to our simplified Location type.
 *
 * Square returns locations with nested address objects and various metadata.
 * We extract only the fields needed by the frontend and use optional chaining
 * to handle missing fields gracefully.
 *
 * @param squareLocation - Raw location object from Square API
 * @returns Simplified location object
 */
export function transformSquareLocation(squareLocation: SquareLocation): Location {
  return {
    id: squareLocation.id,
    name: squareLocation.name,
    address: {
      address_line_1: squareLocation.address?.address_line_1,
      locality: squareLocation.address?.locality,
      administrative_district_level_1: squareLocation.address?.administrative_district_level_1,
      postal_code: squareLocation.address?.postal_code,
    },
    timezone: squareLocation.timezone ?? 'UTC',
    status: squareLocation.status,
  };
}
