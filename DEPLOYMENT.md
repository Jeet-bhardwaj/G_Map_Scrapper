# Deployment Guide

This guide covers deploying the KTYM Lead Generation Engine to various platforms.

## Prerequisites

- Node.js 18+ installed
- MongoDB Atlas cluster set up
- Environment variables configured

## Environment Variables

Create a `.env.local` file (or set environment variables in your deployment platform):

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name?appName=AppName
PUPPETEER_HEADLESS=true
NODE_ENV=production
```

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```
   Or connect your GitHub repository at [vercel.com](https://vercel.com)

3. **Configure Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add `MONGODB_URI` and `PUPPETEER_HEADLESS=true`

4. **Important Notes for Vercel**:
   - Vercel has a 10-second timeout for serverless functions
   - For long-running scrapes, consider using Vercel Pro or alternative platform
   - Puppeteer may require additional configuration on Vercel

### Option 2: Railway

1. **Connect Repository**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"

2. **Configure Environment Variables**:
   - Add `MONGODB_URI` in the Variables tab
   - Set `PUPPETEER_HEADLESS=true`
   - Set `NODE_ENV=production`

3. **Deploy**:
   - Railway will automatically detect Next.js and deploy

### Option 3: Render

1. **Create New Web Service**:
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository

2. **Configure**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Node

3. **Set Environment Variables**:
   - `MONGODB_URI`
   - `PUPPETEER_HEADLESS=true`
   - `NODE_ENV=production`

### Option 4: Docker Deployment

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   COPY package.json package-lock.json* ./
   RUN npm ci

   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build

   # Production image
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

   USER nextjs
   EXPOSE 3000
   ENV PORT 3000
   CMD ["node", "server.js"]
   ```

2. **Build and Run**:
   ```bash
   docker build -t ktym-leads .
   docker run -p 3000:3000 -e MONGODB_URI=your_uri ktym-leads
   ```

### Option 5: Traditional VPS/Server

1. **SSH into your server**

2. **Install Node.js 18+**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup**:
   ```bash
   git clone your-repo-url
   cd G_Map_Scrapper
   npm install
   ```

4. **Create .env.local**:
   ```bash
   nano .env.local
   # Add your environment variables
   ```

5. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

6. **Use PM2 for process management** (recommended):
   ```bash
   npm install -g pm2
   pm2 start npm --name "ktym-leads" -- start
   pm2 save
   pm2 startup
   ```

## MongoDB Atlas Configuration

1. **Whitelist IP Addresses**:
   - Go to MongoDB Atlas → Network Access
   - Add your deployment platform's IP ranges
   - For Vercel: Add `0.0.0.0/0` (allow all) or specific IPs
   - For Railway/Render: Check their documentation for IP ranges

2. **Database User**:
   - Ensure your database user has read/write permissions
   - Username and password should match your connection string

## Puppeteer Configuration

- **Production**: Runs in headless mode automatically
- **Development**: Runs with visible browser (for debugging)
- Set `PUPPETEER_HEADLESS=true` to force headless mode

## Build and Test Locally

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Puppeteer Issues
- Some platforms require additional dependencies
- Consider using `puppeteer-core` with a Chrome binary
- Check platform-specific Puppeteer documentation

### MongoDB Connection
- Verify IP whitelist includes deployment platform IPs
- Check connection string format
- Ensure database user has correct permissions

### Timeout Issues
- Some platforms have function timeout limits
- Consider breaking long operations into smaller chunks
- Use background jobs for heavy scraping

## Security Checklist

- [ ] Environment variables are set (not hardcoded)
- [ ] `.env.local` is in `.gitignore`
- [ ] MongoDB connection string uses strong password
- [ ] IP whitelist is configured in MongoDB Atlas
- [ ] HTTPS is enabled (automatic on most platforms)
- [ ] Rate limiting is considered for production use

## Performance Optimization

- Use headless mode in production (`PUPPETEER_HEADLESS=true`)
- Limit max results to reasonable numbers
- Consider implementing caching for repeated searches
- Monitor API usage and database connections

## Support

For issues specific to deployment platforms, refer to:
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

