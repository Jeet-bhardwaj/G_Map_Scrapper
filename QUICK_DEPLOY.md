# Quick Deployment Guide for G_Map_Scrapper

## ⚠️ IMPORTANT: Puppeteer Deployment Challenges

Your scraper uses Puppeteer (headless Chrome), which has specific requirements:
- **Vercel**: Has strict 10-60 second timeouts (even Pro plans max 300s with issues)
- **Puppeteer**: Requires Chrome binary which is large and resource-intensive
- **Best Options**: Railway, Render, or VPS (Digital Ocean, AWS, Google Cloud)

---

## 🚀 RECOMMENDED: Deploy to Railway (Best for Puppeteer)

Railway is perfect for Puppeteer apps with no timeout limits and better resource allocation.

### Step 1: Push to GitHub

```powershell
# Commit enhanced changes
git add -A
git commit -m "Enhanced phone extraction with 5 advanced methods"
git push origin main
```

### Step 2: Deploy on Railway

1. **Go to**: https://railway.app
2. **Sign up/Login** with GitHub
3. **Click**: "New Project" → "Deploy from GitHub repo"
4. **Select**: `Jeet-bhardwaj/G_Map_Scrapper`
5. **Add Environment Variables**:
   - `MONGODB_URI` = `mongodb+srv://bhardwajjeet408_db_user:4vwqq8oxbceeqaoj@cluster0.jq6unv0.mongodb.net/gmap_scrapper?appName=Cluster0`
   - `PUPPETEER_HEADLESS` = `true`
   - `NODE_ENV` = `production`
   - `PORT` = `3001` (optional, Railway auto-assigns)

6. **Railway Auto-Detects**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

7. **Deploy**: Click "Deploy" - Railway handles everything!

8. **Get URL**: Railway provides a public URL (e.g., `https://your-app.up.railway.app`)

### Estimated Deploy Time: 3-5 minutes

---

## 🔵 Alternative: Deploy to Render (Also Good for Puppeteer)

### Step 1: Push to GitHub (same as above)

### Step 2: Deploy on Render

1. **Go to**: https://render.com
2. **Sign up/Login** with GitHub
3. **Click**: "New +" → "Web Service"
4. **Connect**: Your GitHub repository
5. **Configure**:
   - **Name**: `g-map-scrapper`
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

6. **Add Environment Variables**:
   - `MONGODB_URI` = `mongodb+srv://bhardwajjeet408_db_user:4vwqq8oxbceeqaoj@cluster0.jq6unv0.mongodb.net/gmap_scrapper?appName=Cluster0`
   - `PUPPETEER_HEADLESS` = `true`
   - `NODE_ENV` = `production`

7. **Instance Type**: Select "Starter" ($7/month) or "Free" (with limitations)

8. **Create Web Service**: Render will build and deploy

### Estimated Deploy Time: 5-10 minutes

---

## 🟣 Option 3: Vercel (Quick but Limited)

⚠️ **Warning**: Vercel has timeout limitations that may cause issues with long scraping sessions.

### Quick Deploy:

```powershell
# Make sure you're logged in
vercel login

# Deploy
vercel --prod
```

### Or via Vercel Dashboard:

1. **Go to**: https://vercel.com
2. **Import Project** from GitHub
3. **Add Environment Variable**:
   - `MONGODB_URI` = `mongodb+srv://bhardwajjeet408_db_user:4vwqq8oxbceeqaoj@cluster0.jq6unv0.mongodb.net/gmap_scrapper?appName=Cluster0`

4. **Deploy**

**Limitations**:
- 10s timeout on Hobby plan
- 60s timeout on Pro plan (doesn't help much for scraping)
- Puppeteer may fail due to Chrome binary size

---

## 🐳 Option 4: Docker + Any Cloud (Most Flexible)

### Deploy to Railway/Render/DigitalOcean using Docker:

```powershell
# Test Docker build locally first
docker build -t g-map-scrapper .
docker run -p 3001:3001 -e MONGODB_URI="your_uri" g-map-scrapper

# Then push to Docker Hub
docker tag g-map-scrapper yourusername/g-map-scrapper
docker push yourusername/g-map-scrapper
```

Then deploy the Docker image on any platform.

---

## 📋 Quick Command Reference

### Push Code to GitHub:
```powershell
git add -A
git commit -m "Enhanced phone extraction - ready for deployment"
git push origin main
```

### Test Production Build Locally:
```powershell
npm run build
npm start
# Visit: http://localhost:3001
```

### Deploy to Vercel (Quick Test):
```powershell
vercel --prod
```

---

## 🎯 My Recommendation

**Use Railway** because:
✅ No timeout limitations
✅ Better for Puppeteer/Chrome
✅ Simple deployment from GitHub
✅ Affordable ($5-10/month)
✅ Better resource allocation
✅ No cold starts

**Avoid Vercel** for this project because:
❌ Strict timeouts (10-60s)
❌ Puppeteer issues on serverless
❌ May fail on long scrapes

---

## 🔒 Security Note

Your MongoDB credentials are hardcoded in this guide for quick deployment.

**For production**:
1. Create a `.env` file on the deployment platform
2. Never commit `.env.local` or `.env.production` to Git
3. Use platform's environment variable management
4. Rotate your MongoDB password periodically

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas IP whitelist includes `0.0.0.0/0` (allow all) for cloud deployment
- [ ] Environment variables configured on platform
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] Test the deployed URL
- [ ] Check logs for any errors

---

## 🆘 Troubleshooting

### Issue: "Puppeteer cannot find Chrome"
**Solution**: Use Railway or Render which support Puppeteer better

### Issue: "Timeout error"
**Solution**: Reduce max results or use Railway (no timeouts)

### Issue: "MongoDB connection failed"
**Solution**: Add `0.0.0.0/0` to MongoDB Atlas IP whitelist

### Issue: "Memory exceeded"
**Solution**: Upgrade to paid plan with more memory

---

## 📞 Need Help?

Check deployment logs:
- **Railway**: Dashboard → Deployments → Logs
- **Render**: Dashboard → Logs tab
- **Vercel**: Dashboard → Deployments → Function Logs

---

**Ready to deploy? Start with Railway for best results! 🚀**
