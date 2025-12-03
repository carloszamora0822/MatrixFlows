# MatrixFlow Deployment Guide

## Deploy to Railway

### Step 1: Prerequisites
- GitHub account
- Railway account (sign up at railway.app)
- MongoDB Atlas account (free tier works!)

### Step 2: Setup MongoDB Atlas
1. Go to https://cloud.mongodb.com
2. Create a free cluster
3. Create a database user
4. Whitelist all IPs (0.0.0.0/0) for Railway access
5. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/matrixflow`)

### Step 3: Push to GitHub
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### Step 4: Deploy on Railway
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your MatrixFlow repository
5. Railway will auto-detect and deploy!

### Step 5: Configure Environment Variables
In Railway dashboard, add these variables:

```
NODE_ENV=production
PORT=3001
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key_change_this
CRON_SECRET=your_super_secret_cron_key_change_this
```

**Generate secrets:**
```bash
# On Mac/Linux:
openssl rand -hex 32
```

### Step 6: Get Your Deployment URL
Railway will give you a URL like: `https://matrixflow-production.up.railway.app`

### Step 7: Setup Power Automate
1. Create a new flow in Power Automate
2. Trigger: Recurrence (every 1 minute)
3. Action: HTTP POST
   - URL: `https://your-railway-url.up.railway.app/api/cron/update?secret=YOUR_CRON_SECRET`
   - Method: POST
4. Save and enable the flow

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing key | Random 32-char hex |
| `CRON_SECRET` | Cron endpoint auth | Random 32-char hex |

## Troubleshooting

### Build Fails
- Check that all dependencies are in package.json
- Ensure Node version is >=18.0.0

### Can't Connect to MongoDB
- Whitelist 0.0.0.0/0 in MongoDB Atlas
- Check connection string format
- Verify database user credentials

### Frontend Not Loading
- Check that frontend build completed
- Verify static files are being served
- Check browser console for errors

### Scheduler Not Running
- Verify Power Automate flow is enabled
- Check CRON_SECRET matches in both places
- Look at Railway logs for errors

## Success Checklist
- ✅ App deployed to Railway
- ✅ MongoDB Atlas connected
- ✅ Environment variables configured
- ✅ Power Automate flow running
- ✅ Can login to app
- ✅ Workflows triggering on schedule
