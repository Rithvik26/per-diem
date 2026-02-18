# Performance Optimization Guide

Complete guide to achieving production-grade performance for the Per Diem application.

## Table of Contents

- [Lighthouse Optimization](#lighthouse-optimization)
- [Frontend Optimizations](#frontend-optimizations)
- [Backend Optimizations](#backend-optimizations)
- [Caching Strategy](#caching-strategy)
- [Bundle Size Analysis](#bundle-size-analysis)
- [CDN Configuration](#cdn-configuration)
- [Monitoring](#monitoring)

---

## Lighthouse Optimization

### Target Scores

| Metric | Target | Current |
|--------|--------|---------|
| Performance | 95+ | _Run audit_ |
| Accessibility | 100 | _Run audit_ |
| Best Practices | 95+ | _Run audit_ |
| SEO | 100 | _Run audit_ |

### Running Lighthouse

**Chrome DevTools:**
1. Open DevTools (F12)
2. Navigate to **Lighthouse** tab
3. Select categories: Performance, Accessibility, Best Practices, SEO
4. Click **Generate report**

**CLI:**
```bash
npm install -g lighthouse

# Run audit
lighthouse https://your-app.vercel.app --view

# Save report
lighthouse https://your-app.vercel.app --output=html --output-path=./lighthouse-report.html
```

**CI/CD:**
```bash
# Add to GitHub Actions
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      https://your-app.vercel.app
    uploadArtifacts: true
```

### Checklist for 100 Scores

#### Performance (95+)

- ✅ Code splitting by route
- ✅ Lazy load images
- ✅ Minimize bundle size
- ✅ Use compression (Gzip/Brotli)
- ✅ Optimize fonts (preload, font-display: swap)
- ✅ Reduce server response time (<600ms)
- ✅ Eliminate render-blocking resources
- ✅ Minimize main thread work
- ✅ Reduce JavaScript execution time

#### Accessibility (100)

- ✅ Semantic HTML elements
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Color contrast ratio ≥ 4.5:1
- ✅ Alt text on images
- ✅ Form labels
- ✅ Focus indicators
- ✅ Screen reader testing

#### Best Practices (95+)

- ✅ HTTPS everywhere
- ✅ No console errors
- ✅ Secure headers (CSP, X-Frame-Options, etc.)
- ✅ No deprecated APIs
- ✅ Proper image aspect ratios
- ✅ Valid HTML
- ✅ No mixed content

#### SEO (100)

- ✅ Meta description
- ✅ Document title
- ✅ Meta viewport
- ✅ Robots.txt
- ✅ Sitemap.xml
- ✅ Structured data (JSON-LD)
- ✅ Canonical URLs
- ✅ Valid rel attributes

---

## Frontend Optimizations

### Image Optimization

#### 1. Use Modern Formats (WebP/AVIF)

```typescript
// Generate WebP versions for Square images
const optimizedImageUrl = (url: string) => {
  // For Square-hosted images, they support width/height params
  return `${url}?width=600&format=webp`;
};
```

#### 2. Lazy Loading

Already implemented in `MenuItem.tsx`:

```typescript
<img
  src={item.image_url}
  alt={item.name}
  loading="lazy"  // ← Native lazy loading
  className="w-full h-full object-cover"
/>
```

#### 3. Responsive Images

```typescript
<img
  srcSet={`
    ${item.image_url}?width=400 400w,
    ${item.image_url}?width=800 800w,
    ${item.image_url}?width=1200 1200w
  `}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  src={item.image_url}
  alt={item.name}
/>
```

#### 4. Placeholder Images

Use blur-up technique:

```typescript
import { useState } from 'react';

function MenuItem({ item }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative">
      {/* Blur placeholder */}
      <img
        src={blurDataUrl}
        className={`absolute inset-0 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* Actual image */}
      <img
        src={item.image_url}
        onLoad={() => setImageLoaded(true)}
        className={`transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
```

### Code Splitting

#### 1. Route-Based Splitting

```typescript
// Use React.lazy for route components
import { lazy, Suspense } from 'react';

const MenuPage = lazy(() => import('./pages/MenuPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

function App() {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </Suspense>
  );
}
```

#### 2. Component-Based Splitting

```typescript
// Split heavy components
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <HeavyChart data={chartData} />
    </Suspense>
  );
}
```

### Font Optimization

#### 1. Preload Critical Fonts

```html
<!-- In index.html -->
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

#### 2. Font Display Strategy

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap; /* Show fallback font while loading */
  font-weight: 100 900;
}
```

#### 3. Subset Fonts

```bash
# Use pyftsubset to create font subsets
pip install fonttools

# Latin subset only
pyftsubset Inter-Regular.ttf \
  --output-file=Inter-Regular-Latin.woff2 \
  --flavor=woff2 \
  --unicodes=U+0020-007E
```

### JavaScript Optimization

#### 1. Tree Shaking

Vite automatically tree-shakes. Ensure imports are ES6:

```typescript
// ✅ Good - allows tree shaking
import { useState } from 'react';

// ❌ Bad - imports entire library
import * as React from 'react';
```

#### 2. Remove Console Logs in Production

```typescript
// vite.config.ts
export default defineConfig({
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
```

#### 3. Minification

Already configured in Vite. Verify in build output:

```bash
npm run build

# Should see:
# dist/assets/index-a1b2c3d4.js  120.5 kB │ gzip: 45.2 kB
```

### CSS Optimization

#### 1. Purge Unused CSS

Tailwind automatically purges in production:

```javascript
// tailwind.config.js
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',  // ← Scans for used classes
  ],
};
```

#### 2. Critical CSS

Extract critical CSS for above-the-fold content:

```bash
npm install -D critters

# Update vite.config.ts
import { critters } from 'vite-plugin-critters';

export default defineConfig({
  plugins: [critters()],
});
```

### React Query Optimization

#### 1. Stale Time Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      cacheTime: 10 * 60 * 1000,  // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});
```

#### 2. Prefetching

```typescript
// Prefetch catalog when location selected
const prefetchCatalog = async (locationId: string) => {
  await queryClient.prefetchQuery({
    queryKey: ['catalog', locationId],
    queryFn: () => fetchCatalog(locationId),
  });
};
```

#### 3. Pagination

For large catalogs, implement pagination:

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['catalog', locationId],
  queryFn: ({ pageParam = 0 }) => fetchCatalogPage(locationId, pageParam),
  getNextPageParam: (lastPage, pages) => lastPage.nextCursor,
});
```

---

## Backend Optimizations

### Response Compression

Already configured in `index.ts`:

```typescript
import compression from 'compression';

app.use(compression({
  level: 6,  // Compression level (0-9)
  threshold: 1024,  // Only compress responses > 1KB
}));
```

### Caching Headers

```typescript
// Set cache headers for public endpoints
res.set({
  'Cache-Control': 'public, max-age=300',  // 5 minutes
  'ETag': hashOfResponse,
});
```

### Database Queries (Redis)

```typescript
// Use pipelining for multiple gets
const pipeline = redis.pipeline();
pipeline.get('cache:locations');
pipeline.get('cache:catalog:LOC123');
const results = await pipeline.exec();
```

### API Request Batching

Batch Square API requests where possible:

```typescript
// Instead of multiple sequential calls
const items = await Promise.all([
  squareClient.get(`/catalog/${id1}`),
  squareClient.get(`/catalog/${id2}`),
  squareClient.get(`/catalog/${id3}`),
]);

// Use batch endpoint
const items = await squareClient.post('/catalog/batch-retrieve', {
  object_ids: [id1, id2, id3],
});
```

---

## Caching Strategy

### Multi-Layer Caching

```
Browser Cache (React Query)
         ↓
   CDN Cache (Vercel)
         ↓
  Server Cache (Redis)
         ↓
    Square API
```

### Cache Invalidation

**Time-based:**
- TTL: 5 minutes for all catalog data
- Automatically purges stale data

**Event-based:**
- Square webhook triggers cache clear
- Manual invalidation via admin endpoint (future)

### Cache Warming

```typescript
// Warm cache on server start
async function warmCache() {
  const locations = await fetchLocations();

  for (const location of locations) {
    await fetchCatalog(location.id);
    await fetchCategories(location.id);
  }

  console.log('[cache] Warmed cache for all locations');
}

// Call on server start
warmCache();
```

---

## Bundle Size Analysis

### Analyze Bundle

```bash
# Build with analysis
cd apps/frontend
npm run build

# View bundle analyzer
npx vite-bundle-visualizer
```

### Size Budgets

Set bundle size limits:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 500,  // Warn if chunk > 500KB
  },
});
```

### Target Sizes

| Bundle | Size | Gzipped |
|--------|------|---------|
| Main | <150KB | <50KB |
| Vendor (React) | <60KB | <20KB |
| Vendor (Query) | <40KB | <15KB |
| Total Initial | <250KB | <85KB |

---

## CDN Configuration

### Vercel (Frontend)

Automatically configured. Additional optimizations:

#### 1. Set Cache Headers

```typescript
// vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)\\.(jpg|jpeg|png|gif|svg|ico)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### 2. Edge Functions (Future)

```typescript
// Move API calls to Vercel Edge Functions for faster response
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Runs closer to user
  const data = await fetch('https://backend.railway.app/api/catalog');
  return new Response(data);
}
```

### Railway (Backend)

#### 1. Enable Compression

Already configured via `compression` middleware.

#### 2. Set Cache-Control Headers

```typescript
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=300');
  }
  next();
});
```

---

## Monitoring

### Frontend Monitoring

#### 1. Web Vitals

```bash
npm install web-vitals
```

```typescript
// src/main.tsx
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

onCLS(console.log);  // Cumulative Layout Shift
onFID(console.log);  // First Input Delay
onFCP(console.log);  // First Contentful Paint
onLCP(console.log);  // Largest Contentful Paint
onTTFB(console.log); // Time to First Byte
```

#### 2. Vercel Analytics

```bash
npm install @vercel/analytics
```

```typescript
// src/main.tsx
import { Analytics } from '@vercel/analytics/react';

root.render(
  <>
    <App />
    <Analytics />
  </>
);
```

#### 3. Error Tracking (Sentry)

```bash
npm install @sentry/react
```

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});
```

### Backend Monitoring

#### 1. Response Time Logging

```typescript
import morgan from 'morgan';

app.use(morgan('combined'));

// Log slow requests
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[slow] ${req.method} ${req.url} took ${duration}ms`);
    }
  });

  next();
});
```

#### 2. Redis Monitoring

```typescript
// Monitor cache hit rate
let hits = 0;
let misses = 0;

setInterval(() => {
  const hitRate = hits / (hits + misses);
  console.log(`[cache] Hit rate: ${(hitRate * 100).toFixed(2)}%`);
  hits = 0;
  misses = 0;
}, 60000);
```

---

## Performance Checklist

### Before Deployment

- [ ] Run Lighthouse audit (all categories > 90)
- [ ] Analyze bundle size (`npm run build`)
- [ ] Test on slow 3G network (Chrome DevTools)
- [ ] Test on low-end device
- [ ] Check Web Vitals (CLS, LCP, FID)
- [ ] Verify images are lazy loaded
- [ ] Verify code splitting works
- [ ] Test cache invalidation
- [ ] Check Redis hit rate > 80%
- [ ] Verify compression is enabled (check response headers)

### After Deployment

- [ ] Run Lighthouse on production URL
- [ ] Monitor Core Web Vitals in Search Console
- [ ] Set up Real User Monitoring (RUM)
- [ ] Monitor bundle size over time
- [ ] Track cache hit rates
- [ ] Set up performance budgets in CI
- [ ] Monitor API response times
- [ ] Set up alerting for slow endpoints

---

## Troubleshooting

### Slow Initial Load

1. Check bundle size: `npm run build`
2. Analyze with bundle visualizer
3. Implement code splitting
4. Optimize images
5. Enable compression

### Low Cache Hit Rate

1. Increase TTL if appropriate
2. Warm cache on server start
3. Check Redis connection
4. Verify cache keys are consistent

### High LCP Score

1. Optimize largest image
2. Lazy load below-the-fold images
3. Preload critical resources
4. Reduce server response time

### Layout Shift Issues

1. Set explicit width/height on images
2. Reserve space for dynamic content
3. Use CSS aspect-ratio
4. Avoid inserting content above existing content

---

## Resources

- [Web.dev Performance](https://web.dev/performance/)
- [Lighthouse Docs](https://developers.google.com/web/tools/lighthouse)
- [React Performance](https://react.dev/learn/render-and-commit#optimizing-performance)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [Core Web Vitals](https://web.dev/vitals/)

---

**Last Updated:** February 18, 2026
