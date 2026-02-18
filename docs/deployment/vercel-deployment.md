# Deploying Frontend to Vercel

This guide walks through deploying the Per Diem frontend to Vercel.

## Prerequisites

- Vercel account connected to your GitHub repository
- Backend API deployed and accessible (see [Railway Deployment](./railway-deployment.md))

## Steps

### 1. Configure Project Settings

Since this is a monorepo, Vercel needs to know which directory contains the frontend app.

#### Via Vercel Dashboard:

1. Go to your project settings in Vercel
2. Navigate to **General** → **Root Directory**
3. Set to: `apps/frontend`
4. Click **Save**

#### Via `vercel.json` (Alternative):

Create a `vercel.json` file in the root directory:

```json
{
  "buildCommand": "cd apps/frontend && npm run build",
  "outputDirectory": "apps/frontend/dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### 2. Set Environment Variables

In your Vercel project settings, go to **Settings** → **Environment Variables** and add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | `https://your-backend.railway.app` | Production, Preview, Development |

**Important:** Replace `your-backend.railway.app` with your actual Railway backend URL.

### 3. Configure Build Settings

In Vercel project settings:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Node Version:** 20.x

### 4. Deploy

#### Automatic Deployment (Recommended):

Every push to `main` branch will automatically deploy to production.

#### Manual Deployment:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
cd /path/to/per-diem
vercel --cwd apps/frontend

# For production
vercel --prod --cwd apps/frontend
```

### 5. Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Verification

After deployment:

1. Visit your Vercel URL (e.g., `https://per-diem.vercel.app`)
2. Open browser DevTools → Network tab
3. Select a location from the dropdown
4. Verify API requests are going to your Railway backend
5. Check that menu items load correctly

## Troubleshooting

### Build Fails

**Error:** `Cannot find module '@per-diem/shared-types'`

**Solution:** Ensure the install command includes the shared-types workspace:

```bash
npm install --workspaces
```

### API Calls Failing

**Error:** CORS errors or network failures

**Solution:**
1. Verify `VITE_API_BASE_URL` is set correctly
2. Check backend CORS settings allow your Vercel domain
3. Update backend `.env`:
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```

### Environment Variables Not Working

**Error:** API calls going to `localhost`

**Solution:**
1. Environment variables must start with `VITE_` prefix
2. Redeploy after adding environment variables
3. Check they're set for the correct environment (Production/Preview/Development)

## Performance Optimization

Vercel automatically provides:

- ✅ Global CDN
- ✅ Edge caching
- ✅ Automatic compression (Gzip/Brotli)
- ✅ Image optimization
- ✅ HTTP/2 and HTTP/3

### Enable Analytics (Optional):

1. Go to **Analytics** tab in Vercel dashboard
2. Enable **Web Analytics**
3. Adds performance monitoring to your app

### Speed Insights (Optional):

1. Install: `npm install @vercel/speed-insights`
2. Add to `src/main.tsx`:
   ```typescript
   import { SpeedInsights } from '@vercel/speed-insights/react';

   // Add to your root component
   <SpeedInsights />
   ```

## Rollback

To rollback to a previous deployment:

1. Go to **Deployments** tab
2. Find the working deployment
3. Click **⋯** → **Promote to Production**

## Monitoring

View logs and metrics:

1. **Deployments** tab: Build logs for each deployment
2. **Analytics** tab: Page views, visitor metrics
3. **Logs** tab (if using Vercel Pro): Runtime logs

## Cost

- **Free Tier:** Unlimited deployments, 100GB bandwidth/month
- **Pro:** $20/month for team features and more bandwidth

## Next Steps

- Set up [Preview Deployments](https://vercel.com/docs/concepts/deployments/preview-deployments) for PRs
- Configure [Edge Config](https://vercel.com/docs/storage/edge-config) for feature flags
- Enable [Web Vitals](https://vercel.com/docs/analytics/web-vitals) monitoring
