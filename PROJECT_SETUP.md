# VBT Vestaboard System - Project Setup Guide

## GitHub Repository Setup

### 1. Initialize Git Repository
```bash
cd /Users/carloszamorawork/MatrixFlow
git init
git add .
git commit -m "Initial commit: VBT Vestaboard System sprint planning"
```

### 2. Create GitHub Repository
1. Go to GitHub and create a new repository: `vbt-vestaboard-system`
2. Set it as **Private** (recommended for production system)
3. Don't initialize with README (we already have files)

### 3. Connect Local to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/vbt-vestaboard-system.git
git branch -M main
git push -u origin main
```

## Branch Strategy

### Branch Structure
```
main (production)
├── test (staging/test environment)
└── develop (active development)
    ├── feature/sprint-1-auth
    ├── feature/sprint-2-screen-engine
    ├── feature/sprint-3-manual-data
    ├── feature/sprint-4-external-data
    ├── feature/sprint-5-workflows
    └── feature/sprint-6-production
```

### Setup Branches
```bash
# Create and push test branch
git checkout -b test
git push -u origin test

# Create and push develop branch
git checkout -b develop
git push -u origin develop

# Set develop as default working branch
git checkout develop
```

### Branch Workflow
1. **develop** - Active development, all feature branches merge here
2. **test** - Staging environment, merge from develop when sprint is complete
3. **main** - Production environment, merge from test when tested and approved

```bash
# For each sprint, create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/sprint-1-auth

# Work on sprint...
# When sprint is complete:
git add .
git commit -m "Complete Sprint 1: Foundation & Authentication"
git push origin feature/sprint-1-auth

# Create PR to merge into develop
# After testing in develop, merge to test
# After testing in test, merge to main
```

## API Key Management Strategy

### 1. Environment-Based API Keys

#### Vercel Environment Variables (Recommended)
Store API keys securely in Vercel's environment variable system:

**Test Environment (test branch)**:
- `VESTABOARD_API_KEY` → Your test API key
- `OPENWEATHER_API_KEY` → Your test weather API key
- `MONGODB_URI` → Test database connection

**Production Environment (main branch)**:
- `VESTABOARD_API_KEY` → Your production API key  
- `OPENWEATHER_API_KEY` → Your production weather API key
- `MONGODB_URI` → Production database connection

#### Setup in Vercel:
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add variables with different values for Preview (test) vs Production (main)

### 2. Local Development Setup

#### Environment Files Structure
```
MatrixFlow/
├── .env.example          # Template with dummy values
├── .env.local           # Local development (gitignored)
├── .env.test            # Test environment template  
└── .env.production      # Production environment template
```

#### Create Environment Files
```bash
# .env.example (committed to git)
MONGODB_URI=mongodb://localhost:27017/vbt-vestaboard-dev
JWT_SECRET=your-jwt-secret-here
OPENWEATHER_API_KEY=your-openweather-api-key
VESTABOARD_API_KEY=your-vestaboard-api-key
CRON_SECRET=your-cron-secret
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ORG_ID=VBT
ORG_NAME=VBT

# .env.local (NOT committed - for local development)
MONGODB_URI=mongodb://localhost:27017/vbt-vestaboard-dev
JWT_SECRET=dev-jwt-secret-change-in-production
OPENWEATHER_API_KEY=your-actual-test-api-key
VESTABOARD_API_KEY=your-actual-test-vestaboard-key
CRON_SECRET=dev-cron-secret
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ORG_ID=VBT
ORG_NAME=VBT
```

### 3. Secure API Key Storage Options

#### Option A: Vercel Environment Variables (Recommended)
- Most secure for production
- Automatic deployment integration
- Different values per environment
- No keys in code repository

#### Option B: GitHub Secrets (Alternative)
If using GitHub Actions for deployment:
```yaml
# .github/workflows/deploy.yml
env:
  VESTABOARD_API_KEY: ${{ secrets.VESTABOARD_API_KEY }}
  OPENWEATHER_API_KEY: ${{ secrets.OPENWEATHER_API_KEY }}
```

#### Option C: External Secret Management
For enterprise setups:
- AWS Secrets Manager
- Azure Key Vault  
- HashiCorp Vault

### 4. Environment Detection Logic

#### Backend Environment Detection
```javascript
// backend/lib/config.js
const getConfig = () => {
  const environment = process.env.NODE_ENV || 'development';
  const branch = process.env.VERCEL_GIT_COMMIT_REF || 'develop';
  
  // Determine which API keys to use based on environment
  const config = {
    environment,
    branch,
    mongodb: {
      uri: process.env.MONGODB_URI
    },
    vestaboard: {
      apiKey: process.env.VESTABOARD_API_KEY
    },
    openweather: {
      apiKey: process.env.OPENWEATHER_API_KEY,
      location: process.env.OPENWEATHER_LOCATION || 'Bentonville,US'
    },
    jwt: {
      secret: process.env.JWT_SECRET
    },
    cron: {
      secret: process.env.CRON_SECRET
    }
  };

  // Validate required environment variables
  const required = [
    'MONGODB_URI',
    'JWT_SECRET', 
    'VESTABOARD_API_KEY',
    'OPENWEATHER_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return config;
};

module.exports = { getConfig };
```

## Deployment Configuration

### Vercel Configuration by Branch
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "build" }
    },
    {
      "src": "backend/api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/api/$1" },
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ],
  "functions": {
    "backend/api/**/*.js": { "maxDuration": 30 }
  },
  "crons": [
    {
      "path": "/api/system/run-scheduler",
      "schedule": "* * * * *"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment-Specific Vercel Projects
Consider creating separate Vercel projects:
- `vbt-vestaboard-test` (connected to `test` branch)
- `vbt-vestaboard-prod` (connected to `main` branch)

## Security Best Practices

### 1. .gitignore Setup
```bash
# .gitignore
.env.local
.env.test
.env.production
node_modules/
.DS_Store
*.log
build/
dist/
.vercel
```

### 2. API Key Rotation
- Regularly rotate API keys
- Use different keys for test vs production
- Monitor API key usage in respective dashboards

### 3. Access Control
- Limit GitHub repository access
- Use branch protection rules on main/test branches
- Require pull request reviews

## Getting Started Commands

### Initial Setup
```bash
# Clone and setup
git clone https://github.com/YOUR_USERNAME/vbt-vestaboard-system.git
cd vbt-vestaboard-system
git checkout develop

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your actual API keys

# Install dependencies
npm run install:all

# Start development
npm run dev
```

### Sprint Development Workflow
```bash
# Start new sprint
git checkout develop
git pull origin develop
git checkout -b feature/sprint-1-auth

# Develop sprint features...
# Test locally with: npm run dev

# Commit and push
git add .
git commit -m "Complete Sprint 1: Foundation & Authentication"
git push origin feature/sprint-1-auth

# Create Pull Request to develop branch
# After review, merge to develop
# Test in develop environment
# When ready, merge develop → test → main
```

This setup gives you:
✅ **Secure API key management** with different keys per environment
✅ **Proper branch strategy** with test → production flow  
✅ **Environment isolation** between development, test, and production
✅ **Automated deployments** based on branch merges
✅ **Security best practices** with no secrets in code
