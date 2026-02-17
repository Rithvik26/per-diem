import { http, HttpResponse } from 'msw';
import { mockLocations, mockCategories, mockCatalog } from './data';

const API_BASE_URL = 'http://localhost:3001/api';

export const handlers = [
  // GET /api/locations
  http.get(`${API_BASE_URL}/locations`, () => {
    return HttpResponse.json({ locations: mockLocations });
  }),

  // GET /api/catalog/categories
  http.get(`${API_BASE_URL}/catalog/categories`, ({ request }) => {
    const url = new URL(request.url);
    const locationId = url.searchParams.get('location_id');

    if (!locationId) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'location_id is required' } },
        { status: 400 },
      );
    }

    return HttpResponse.json({ categories: mockCategories });
  }),

  // GET /api/catalog
  http.get(`${API_BASE_URL}/catalog`, ({ request }) => {
    const url = new URL(request.url);
    const locationId = url.searchParams.get('location_id');

    if (!locationId) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'location_id is required' } },
        { status: 400 },
      );
    }

    return HttpResponse.json({ categories: mockCatalog });
  }),
];

// Error handlers for testing error states
export const errorHandlers = [
  http.get(`${API_BASE_URL}/locations`, () => {
    return HttpResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 },
    );
  }),
];
