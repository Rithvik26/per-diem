# Deploying Backend to Railway

This guide walks through deploying the Per Diem backend API to Railway.

## Prerequisites

- Railway account connected to your GitHub repository
- Square Sandbox or Production account
- Upstash Redis account (or use Railway's Redis addon)

## Steps

### 1. Create New Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose your `per-diem` repository
5. Name it: `per-diem-backend`

### 2. Configure Root Directory

Since this is a monorepo, configure the root directory:

1. Go to **Settings** tab
2. Under **Build**, set:
   - **Root Directory:** `apps/backend`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`

Or use `railway.json` in project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd apps/backend && npm ci && npm run build"
  },
  "deploy": {
    "startCommand": "cd apps/backend && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3. Add Redis Service

#### Option A: Railway Redis (Recommended for simplicity)

1. In your project, click **+ New**
2. Select **Database** → **Add Redis**
3. Railway will automatically set `REDIS_URL` environment variable
4. Done! Skip to step 4.

#### Option B: Upstash Redis (Recommended for production)

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create new Redis database
3. Copy the connection URL (format: `redis://default:PASSWORD@HOST:PORT`)
4. In Railway, go to backend service → **Variables** tab
5. Add:
   ```
   REDIS_URL=redis://default:PASSWORD@HOST:PORT
   ```

### 4. Set Environment Variables

In Railway backend service, go to **Variables** tab and add:

```bash
# Square API
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_ENVIRONMENT=sandbox
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key

# Server Configuration
PORT=3000
NODE_ENV=production

# Cache Configuration
CACHE_PROVIDER=redis
CACHE_TTL_SECONDS=300

# Redis (automatically set if using Railway Redis, otherwise use Upstash URL)
# REDIS_URL=redis://default:PASSWORD@HOST:PORT

# CORS (update after deploying frontend)
CORS_ORIGIN=https://your-app.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=50
```

**Important Notes:**
- Replace `your_square_access_token` with your actual Square token
- Update `CORS_ORIGIN` with your Vercel frontend URL after deploying frontend
- `REDIS_URL` is auto-set if using Railway Redis

### 5. Configure Networking

1. Go to **Settings** → **Networking**
2. Click **Generate Domain** to get a public URL
3. Note this URL (e.g., `per-diem-backend.up.railway.app`)
4. You'll use this as `VITE_API_BASE_URL` in Vercel

### 6. Deploy

Railway will automatically deploy on push to `main` branch.

#### Manual Deploy:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

### 7. Health Check Configuration

Railway automatically monitors the `/health` endpoint.

In **Settings** → **Health Check**, verify:
- **Path:** `/health`
- **Timeout:** 10 seconds
- **Interval:** 30 seconds

### 8. Set up Webhooks (Optional)

For Square webhook cache invalidation:

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Go to **Webhooks** tab
4. Add webhook URL: `https://your-backend.railway.app/webhooks/square/catalog-updated`
5. Subscribe to event: `catalog.version.updated`
6. Copy the signature key and add to Railway:
   ```
   SQUARE_WEBHOOK_SIGNATURE_KEY=your_signature_key
   ```

## Verification

After deployment:

1. Visit `https://your-backend.railway.app/health`
   - Should return: `{"status":"ok"}`

2. Test locations endpoint:
   ```bash
   curl https://your-backend.railway.app/api/locations
   ```

3. Check Railway logs:
   - Go to **Deployments** tab
   - Click latest deployment
   - View build and runtime logs

## Troubleshooting

### Build Fails

**Error:** `Cannot find module '@per-diem/shared-types'`

**Solution:** Update build command to install from root:

```bash
npm ci --workspaces && cd apps/backend && npm run build
```

### Redis Connection Fails

**Error:** `Error: connect ECONNREFUSED`

**Solution:**
1. Verify `REDIS_URL` is set correctly
2. Check Redis service is running
3. Ensure `CACHE_PROVIDER=redis` is set
4. View Redis service logs in Railway

### CORS Errors from Frontend

**Error:** `Access-Control-Allow-Origin header is missing`

**Solution:**
1. Verify `CORS_ORIGIN` includes your Vercel URL
2. For multiple origins, set comma-separated:
   ```
   CORS_ORIGIN=https://app.vercel.app,https://preview.vercel.app
   ```

### Health Check Failing

**Error:** Service keeps restarting

**Solution:**
1. Check `/health` endpoint is working:
   ```bash
   railway run npm start
   # In another terminal:
   curl http://localhost:3000/health
   ```
2. Increase health check timeout in Settings

### Port Issues

**Error:** `EADDRINUSE` or port binding errors

**Solution:**
Railway automatically sets the `PORT` environment variable. Ensure your code uses it:

```typescript
const PORT = process.env.PORT || 3000;
```

## Monitoring

### View Logs

```bash
# CLI
railway logs

# Or view in Dashboard → Deployments → Logs tab
```

### Metrics

Go to **Metrics** tab to view:
- CPU usage
- Memory usage
- Network traffic
- Request rates

### Alerts (Pro Plan)

Set up alerts for:
- High CPU/Memory usage
- Deployment failures
- Health check failures

## Scaling

### Vertical Scaling

1. Go to **Settings** → **Resources**
2. Upgrade plan for more CPU/RAM
3. Plans start at $5/month for 512MB RAM, 1 vCPU

### Horizontal Scaling (Not needed for this project)

Railway supports horizontal scaling but requires Pro plan ($20/month).

## Cost Estimation

**Free Tier:**
- $5 credit/month
- Good for testing
- Includes sleep mode after inactivity

**Hobby Plan: $5/month**
- 512MB RAM, 1 vCPU
- Sufficient for low-traffic apps
- No sleep mode
- Good for demo/portfolio projects

**Recommended for Per Diem Demo:**
- Backend: Hobby plan ($5/month)
- Redis: Free tier (Railway) or Upstash free tier
- **Total: $5/month**

## Rollback

To rollback to a previous deployment:

1. Go to **Deployments** tab
2. Find the working deployment
3. Click **⋯** → **Redeploy**

## CI/CD

Railway automatically deploys on:
- Push to `main` branch
- Pull request merge

### Disable Auto-Deploy:

1. Go to **Settings** → **Source**
2. Toggle **Auto-deploy** off
3. Deploy manually via CLI or dashboard

## Environment-Specific Deployments

### Staging Environment:

1. Create new service: `per-diem-backend-staging`
2. Link to `staging` branch
3. Use separate Square Sandbox credentials
4. Use separate Redis instance

### Production Checklist:

- ✅ Use production Square credentials
- ✅ Set `SQUARE_ENVIRONMENT=production`
- ✅ Use production-grade Redis (Upstash Pro)
- ✅ Set appropriate `CACHE_TTL_SECONDS` (300-600)
- ✅ Configure rate limiting for production traffic
- ✅ Set up monitoring and alerts
- ✅ Enable auto-scaling if needed
- ✅ Set up backup/restore for Redis

## Next Steps

- Set up [Railway Private Networking](https://docs.railway.app/reference/private-networking) for Redis
- Enable [Cron Jobs](https://docs.railway.app/reference/cron-jobs) for cleanup tasks
- Configure [Custom Domain](https://docs.railway.app/reference/domains) for backend
- Set up [Observability](https://docs.railway.app/guides/observability) with DataDog/New Relic
