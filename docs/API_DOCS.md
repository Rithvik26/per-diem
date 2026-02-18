# Per Diem API Documentation

Complete API reference for the Per Diem backend service.

**Base URL:** `https://your-backend.railway.app` (Production) or `http://localhost:3001` (Development)

**API Version:** v1
**Content-Type:** `application/json`
**Response Format:** JSON

---

## Table of Contents

- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Get Locations](#get-locations)
  - [Get Catalog](#get-catalog)
  - [Get Categories](#get-categories)
- [Webhooks](#webhooks)
- [Types](#types)

---

## Authentication

Currently, the API does not require end-user authentication. The backend uses a server-to-server Square API token configured via environment variables.

**Future Enhancement:** Add API key authentication for client requests.

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { }  // Optional additional context
  }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 304 | Not Modified | Resource hasn't changed (ETag match) |
| 400 | Bad Request | Invalid request parameters |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 502 | Bad Gateway | Square API error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `SQUARE_API_ERROR` | Error from Square API |
| `CACHE_ERROR` | Cache service error |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Rate Limiting

**Default Limits:**
- **Window:** 60 seconds (1 minute)
- **Max Requests:** 50 requests per window

When limit is exceeded, API returns `429 Too Many Requests`:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "details": {
      "retryAfter": 42  // Seconds until next allowed request
    }
  }
}
```

**Headers:**
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 12
X-RateLimit-Reset: 1640000000
```

---

## Endpoints

### Health Check

Check if the API service is running.

**Endpoint:** `GET /health`

**Authentication:** None required

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "timestamp": "2026-02-18T12:00:00.000Z",
  "uptime": 3600.5
}
```

**Example:**

```bash
curl https://your-backend.railway.app/health
```

---

### Get Locations

Retrieve all active Square merchant locations.

**Endpoint:** `GET /api/locations`

**Authentication:** None required

**Query Parameters:** None

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=300
ETag: "abc123"

{
  "locations": [
    {
      "id": "LOCATION123",
      "name": "Main Street Restaurant",
      "address": {
        "address_line_1": "123 Main St",
        "locality": "San Francisco",
        "administrative_district_level_1": "CA",
        "postal_code": "94102"
      },
      "timezone": "America/Los_Angeles",
      "status": "ACTIVE"
    }
  ]
}
```

**Caching:**
- Cache key: `cache:locations`
- TTL: 5 minutes
- ETag support: Yes

**Example:**

```bash
curl https://your-backend.railway.app/api/locations
```

**Error Responses:**

```http
HTTP/1.1 502 Bad Gateway

{
  "error": {
    "code": "SQUARE_API_ERROR",
    "message": "Failed to fetch locations from Square API"
  }
}
```

---

### Get Catalog

Retrieve menu items grouped by category for a specific location.

**Endpoint:** `GET /api/catalog`

**Authentication:** None required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `location_id` | string | Yes | Square location ID |

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=300
ETag: "def456"

{
  "categories": [
    {
      "category": "Pizza",
      "categoryId": "CAT123",
      "items": [
        {
          "id": "ITEM456",
          "name": "Margherita Pizza",
          "description": "Classic pizza with fresh mozzarella, tomatoes, and basil",
          "category": "Pizza",
          "image_url": "https://items-images-sandbox.s3.us-west-2.amazonaws.com/...",
          "variations": [
            {
              "id": "VAR789",
              "name": "Small",
              "priceDollars": 12.99,
              "priceFormatted": "$12.99"
            },
            {
              "id": "VAR790",
              "name": "Large",
              "priceDollars": 18.99,
              "priceFormatted": "$18.99"
            }
          ]
        }
      ]
    },
    {
      "category": "Drinks",
      "categoryId": "CAT124",
      "items": [...]
    }
  ]
}
```

**Key Features:**
- Items are grouped by category name
- Categories sorted alphabetically
- Each item includes:
  - Category name (joined from related_objects)
  - Image URL (joined from related_objects)
  - Price variations with formatted prices
- Missing categories show as "Uncategorized"

**Caching:**
- Cache key: `cache:catalog:{location_id}`
- TTL: 5 minutes
- ETag support: Yes

**Example:**

```bash
curl "https://your-backend.railway.app/api/catalog?location_id=LOCATION123"
```

**Error Responses:**

```http
HTTP/1.1 400 Bad Request

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "location_id is required"
  }
}
```

```http
HTTP/1.1 200 OK

{
  "categories": []  // No items for this location
}
```

---

### Get Categories

Retrieve categories with item counts for a specific location.

**Endpoint:** `GET /api/catalog/categories`

**Authentication:** None required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `location_id` | string | Yes | Square location ID |

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=300
ETag: "ghi789"

{
  "categories": [
    {
      "id": "CAT123",
      "name": "Pizza",
      "item_count": 5
    },
    {
      "id": "CAT124",
      "name": "Drinks",
      "item_count": 8
    },
    {
      "id": "CAT125",
      "name": "Desserts",
      "item_count": 3
    }
  ]
}
```

**Key Features:**
- Only includes categories that have items
- Sorted alphabetically by name
- Item count per category
- Excludes MENU_CATEGORY types (only REGULAR_CATEGORY)

**Caching:**
- Cache key: `cache:categories:{location_id}`
- TTL: 5 minutes
- ETag support: Yes

**Example:**

```bash
curl "https://your-backend.railway.app/api/catalog/categories?location_id=LOCATION123"
```

**Error Responses:**

```http
HTTP/1.1 400 Bad Request

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "location_id is required"
  }
}
```

---

## Webhooks

### Square Catalog Updated

Square webhook for cache invalidation when catalog changes.

**Endpoint:** `POST /webhooks/square/catalog-updated`

**Authentication:** HMAC signature verification

**Headers:**

```
X-Square-Signature: sha256=...
Content-Type: application/json
```

**Request Body:**

```json
{
  "merchant_id": "MERCHANT123",
  "type": "catalog.version.updated",
  "event_id": "evt_abc123",
  "created_at": "2026-02-18T12:00:00Z",
  "data": {
    "type": "catalog",
    "id": "catalog",
    "object": {
      "catalog_version": {
        "updated_at": "2026-02-18T12:00:00Z",
        "version": 1234567890
      }
    }
  }
}
```

**Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "invalidated": [
    "cache:catalog:*",
    "cache:categories:*"
  ]
}
```

**Signature Verification:**

The webhook verifies Square's HMAC signature to ensure authenticity:

```typescript
const signature = request.headers['x-square-signature'];
const payload = JSON.stringify(request.body);
const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SIGNATURE_KEY)
  .update(payload)
  .digest('base64');

if (signature !== `sha256=${expectedSignature}`) {
  return 401 Unauthorized;
}
```

**Setup:**

1. Go to Square Developer Dashboard → Webhooks
2. Add URL: `https://your-backend.railway.app/webhooks/square/catalog-updated`
3. Subscribe to event: `catalog.version.updated`
4. Copy signature key
5. Add to env: `SQUARE_WEBHOOK_SIGNATURE_KEY=your_key`

**Error Responses:**

```http
HTTP/1.1 401 Unauthorized

{
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Webhook signature verification failed"
  }
}
```

---

## Types

### Location

```typescript
interface Location {
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
```

### CategoryGroup

```typescript
interface CategoryGroup {
  category: string;      // Category name (e.g., "Pizza")
  categoryId: string;    // Square category ID
  items: MenuItem[];     // Array of menu items
}
```

### MenuItem

```typescript
interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category: string;      // Category name
  image_url?: string;
  variations: MenuItemVariation[];
}
```

### MenuItemVariation

```typescript
interface MenuItemVariation {
  id: string;
  name: string;          // e.g., "Small", "Large"
  priceDollars: number;  // Price as decimal (12.99)
  priceFormatted: string; // Formatted with $ sign ("$12.99")
}
```

### Category

```typescript
interface Category {
  id: string;
  name: string;
  item_count: number;
}
```

---

## Pagination

### Square API Pagination

The backend automatically handles Square's cursor-based pagination:

```typescript
// Automatic aggregation across pages
const allItems = await aggregateSquarePages(async (cursor) => {
  const response = await squareClient.post('/catalog/search', {
    object_types: ['ITEM'],
    limit: 100,
    cursor  // ← Automatically passed for next page
  });

  return {
    objects: response.data.objects,
    cursor: response.data.cursor  // ← Square returns this
  };
});
```

**Note:** Clients don't need to handle pagination - the API returns all results in a single response.

---

## Caching Details

### Cache Keys

| Resource | Key Pattern | TTL |
|----------|-------------|-----|
| Locations | `cache:locations` | 5 min |
| Catalog | `cache:catalog:{location_id}` | 5 min |
| Categories | `cache:categories:{location_id}` | 5 min |

### Cache Headers

```http
Cache-Control: public, max-age=300
ETag: "hash-of-response"
```

**ETag Support:**
- Client sends: `If-None-Match: "hash-of-response"`
- Server responds: `304 Not Modified` if unchanged
- Reduces bandwidth and improves performance

### Cache Providers

**Memory (Development):**
```bash
CACHE_PROVIDER=memory
```
- Fast, no setup
- Lost on restart
- Not shared across instances

**Redis (Production):**
```bash
CACHE_PROVIDER=redis
REDIS_URL=redis://default:PASSWORD@HOST:PORT
```
- Persistent
- Shared across instances
- Supports horizontal scaling

---

## Performance

### Response Times

| Endpoint | Cached | Uncached |
|----------|--------|----------|
| `/health` | N/A | <10ms |
| `/api/locations` | <5ms | 200-500ms |
| `/api/catalog` | <10ms | 500-1500ms |
| `/api/catalog/categories` | <10ms | 400-800ms |

**Note:** Uncached times depend on Square API latency and catalog size.

### Optimization Tips

1. **Use ETags:** Send `If-None-Match` header for conditional requests
2. **Leverage Cache:** Don't refetch data within 5-minute window
3. **Batch Requests:** Avoid sequential API calls (use React Query)
4. **Client Caching:** Implement browser-level caching (React Query staleTime)

---

## Development

### Testing Endpoints Locally

```bash
# Health check
curl http://localhost:3001/health

# Get locations
curl http://localhost:3001/api/locations

# Get catalog (replace with your location ID)
curl "http://localhost:3001/api/catalog?location_id=YOUR_LOCATION_ID"

# Get categories
curl "http://localhost:3001/api/catalog/categories?location_id=YOUR_LOCATION_ID"
```

### Testing Webhooks Locally

Use [ngrok](https://ngrok.com/) to expose local server:

```bash
# Start backend
npm run dev

# In another terminal
ngrok http 3001

# Use ngrok URL in Square webhook settings
# e.g., https://abc123.ngrok.io/webhooks/square/catalog-updated
```

---

## Changelog

### v1.0.0 (2026-02-18)

- Initial release
- GET `/health` endpoint
- GET `/api/locations` endpoint
- GET `/api/catalog` endpoint
- GET `/api/catalog/categories` endpoint
- POST `/webhooks/square/catalog-updated` webhook
- Redis caching support
- Rate limiting (50 req/min)
- ETag support

---

## Support

For API issues or questions:

- **GitHub Issues:** [github.com/Rithvik26/per-diem/issues](https://github.com/Rithvik26/per-diem/issues)
- **Email:** [your-email@example.com]
- **Documentation:** [README.md](../README.md)

---

**Last Updated:** February 18, 2026
**API Version:** 1.0.0
