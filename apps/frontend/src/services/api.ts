import axios, { AxiosError } from 'axios';
import type {
  Location,
  Category,
  CategoryGroup,
  LocationsResponse,
  CategoriesResponse,
  CatalogResponse,
} from '@per-diem/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handling helper
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error: { message: string; code: string } }>;
    const message = axiosError.response?.data?.error?.message || axiosError.message;
    const code = axiosError.response?.data?.error?.code;
    const statusCode = axiosError.response?.status;

    throw new ApiError(message, statusCode, code);
  }

  if (error instanceof Error) {
    throw new ApiError(error.message);
  }

  throw new ApiError('An unknown error occurred');
}

/**
 * Fetch all active Square locations
 */
export async function fetchLocations(): Promise<Location[]> {
  try {
    const response = await apiClient.get<LocationsResponse>('/locations');
    return response.data.locations;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetch categories for a specific location
 */
export async function fetchCategories(locationId: string): Promise<Category[]> {
  try {
    const response = await apiClient.get<CategoriesResponse>('/catalog/categories', {
      params: { location_id: locationId },
    });
    return response.data.categories;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetch full catalog (items grouped by category) for a specific location
 */
export async function fetchCatalog(locationId: string): Promise<CategoryGroup[]> {
  try {
    const response = await apiClient.get<CatalogResponse>('/catalog', {
      params: { location_id: locationId },
    });
    return response.data.categories;
  } catch (error) {
    return handleApiError(error);
  }
}

export default apiClient;
