# MatrixFlow Deployment Guide

## Deploy to Vercel (Frontend) + Render (Backend)

**100% FREE Deployment!** ✅

This guide will help you deploy:
- **Frontend** → Vercel (FREE forever)
- **Backend** → Render (FREE tier)
- **Database** → MongoDB Atlas (FREE tier)
- **Scheduler** → Power Automate (FREE with Microsoft 365)

---

## Quick Start (5 Steps)

1. Deploy Backend to Render
2. Deploy Frontend to Vercel
3. Setup MongoDB Atlas
4. Configure Environment Variables
5. Setup Power Automate

---

## Step 1: Deploy Backend to Render

### 1.1 Create Render Account
- Go to https://render.com
- Sign up with GitHub

### 1.2 Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `carloszamora0822/MatrixFlows`
3. Configure:
   - **Name:** `matrixflow-backend`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node api/index.js`
   - **Plan:** Free

### 1.3 Add Environment Variables
Click "Environment" tab and add:

```
NODE_ENV=production
PORT=3001
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<generate-with-openssl>
CRON_SECRET=<generate-with-openssl>
```

**Generate secrets:**
```bash
openssl rand -hex 32
```

### 1.4 Deploy!
- Click "Create Web Service"
- Wait ~5 minutes for deployment
- Note your backend URL: `https://matrixflow-backend.onrender.com`

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
- Go to https://vercel.com
- Sign up with GitHub

### 2.2 Import Project
1. Click "Add New..." → "Project"
2. Import `carloszamora0822/MatrixFlows`
3. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

### 2.3 Add Environment Variable
Click "Environment Variables" and add:

```
REACT_APP_API_URL=https://matrixflow-backend.onrender.com
```

**IMPORTANT:** Use YOUR actual Render backend URL from Step 1!

### 2.4 Deploy!
- Click "Deploy"
- Wait ~2 minutes
- Note your frontend URL: `https://matrixflow.vercel.app`

---

## Deploy to Railway (Alternative)

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
