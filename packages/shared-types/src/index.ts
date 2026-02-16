// ============================================================
// Square API Response Types (internal, not exposed to frontend)
// ============================================================

export interface SquareMoney {
  amount: number; // in cents
  currency: string;
}

export interface SquareAddress {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string; // city
  administrative_district_level_1?: string; // state
  postal_code?: string;
  country?: string;
}

export interface SquareLocation {
  id: string;
  name: string;
  address?: SquareAddress;
  timezone?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SquareCatalogVariation {
  type: 'ITEM_VARIATION';
  id: string;
  item_variation_data: {
    name: string;
    pricing_type: 'FIXED_PRICING' | 'VARIABLE_PRICING';
    price_money?: SquareMoney;
  };
}

export interface SquareCatalogImage {
  type: 'IMAGE';
  id: string;
  image_data: {
    url: string;
    caption?: string;
  };
}

export interface SquareCatalogCategory {
  type: 'CATEGORY';
  id: string;
  category_data: {
    name: string;
  };
}

export interface SquareCatalogItem {
  type: 'ITEM';
  id: string;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  item_data: {
    name: string;
    description?: string;
    category_id?: string;
    image_ids?: string[];
    variations?: SquareCatalogVariation[];
  };
}

export type SquareCatalogObject =
  | SquareCatalogItem
  | SquareCatalogCategory
  | SquareCatalogImage
  | SquareCatalogVariation;

export interface SquareSearchCatalogResponse {
  objects?: SquareCatalogObject[];
  related_objects?: SquareCatalogObject[];
  cursor?: string;
}

export interface SquareListLocationsResponse {
  locations?: SquareLocation[];
}

// ============================================================
// API Response Types (what the frontend receives)
// ============================================================

export interface Location {
  id: string;
  name: string;
  address: {
    address_line_1?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
  };
  timezone: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface MenuItemVariation {
  id: string;
  name: string;
  priceDollars: number;
  priceFormatted: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string | null;
  variations: MenuItemVariation[];
}

export interface CategoryGroup {
  category: string;
  categoryId: string;
  items: MenuItem[];
}

export interface Category {
  id: string;
  name: string;
  item_count: number;
}

// ============================================================
// API Response Wrappers
// ============================================================

export interface ApiResponse<T> {
  success: true;
  data: T;
  cached: boolean;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ============================================================
// Endpoint-specific Response Types
// ============================================================

export interface LocationsResponse {
  locations: Location[];
}

export interface CategoriesResponse {
  categories: Category[];
}

export type CatalogResponse = ApiResponse<CategoryGroup[]>;

// ============================================================
// Webhook Types
// ============================================================

export interface SquareWebhookEvent {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: Record<string, unknown>;
  };
}
