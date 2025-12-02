# VBT Vestaboard System - Implementation Guide

## Quick Start Commands

### Development
```bash
# Start the complete application in TEST mode
npm run dev
```

### Deployment
```bash
# Deploy the application to production
npm run deploy
```

## Sprint Implementation Order

### Sprint 1: Foundation & Authentication ✅
**Goal**: Basic project structure, authentication system, and user management
- [x] Project structure setup
- [x] MongoDB connection and user models
- [x] JWT authentication system
- [x] Login/logout functionality
- [x] Basic dashboard with user info
- [x] Role-based authorization (admin/editor/viewer)

**Key Files Created**:
- `backend/models/User.js` - User model with password hashing
- `backend/lib/auth.js` - JWT utilities and middleware
- `backend/api/auth/login.js` - Login endpoint
- `frontend/src/hooks/useAuth.js` - Authentication hook
- `frontend/src/components/auth/LoginForm.js` - Login form component

### Sprint 2: Screen Engine & Character Mapping ✅
**Goal**: Core rendering engine that converts screen configs to 6×22 matrices
- [x] Complete Vestaboard character mapping (70 character codes)
- [x] Screen engine with template support
- [x] Matrix visualization component
- [x] Preview API endpoint
- [x] All manual screen templates (Birthday, Checkrides, etc.)

**Key Files Created**:
- `shared/constants.js` - Complete character mapping
- `backend/lib/screenEngine.js` - Core rendering engine
- `backend/lib/templates.js` - Screen templates
- `frontend/src/components/ui/MatrixPreview.js` - Matrix visualization
- `backend/api/screens/preview.js` - Preview endpoint

### Sprint 3: Manual Data Management ✅
**Goal**: CRUD operations for all manual data types with validation and UI
- [x] Database models for all manual data types
- [x] CRUD API endpoints with validation
- [x] UI pages for data management
- [x] Form components with live validation
- [x] Live preview integration

**Key Files Created**:
- `backend/models/Birthday.js` - Birthday model
- `backend/models/Checkride.js` - Checkride model
- `backend/api/birthdays/index.js` - Birthday CRUD API
- `frontend/src/pages/data/Birthdays.js` - Birthday management page
- `backend/lib/validation.js` - Input validation functions

### Sprint 4: External Data & Weather Screens ✅
**Goal**: Integration with external APIs and weather screen rendering
- [x] METAR API client with caching
- [x] OpenWeatherMap API client
- [x] Weather screen templates (CLOUDY/SUNNY)
- [x] Custom message system with border styles
- [x] External data error handling

**Key Files Created**:
- `backend/lib/clients/metarClient.js` - METAR API integration
- `backend/lib/clients/weatherClient.js` - OpenWeather integration
- `backend/models/CustomMessage.js` - Custom message model
- `backend/lib/customMessageTemplates.js` - Message border templates
- `frontend/src/pages/external/WeatherTest.js` - Weather testing page

### Sprint 5: Workflows & Scheduling ✅
**Goal**: Complete workflow system with scheduling and board management
- [x] Vestaboard and Workflow database models
- [x] Workflow CRUD operations with scheduling
- [x] Board management system
- [x] Scheduler service with cron integration
- [x] Vestaboard API client
- [x] Workflow management UI

**Key Files Created**:
- `backend/models/Workflow.js` - Workflow model with scheduling
- `backend/models/Vestaboard.js` - Vestaboard model
- `backend/lib/workflowService.js` - Workflow logic and scheduling
- `backend/lib/scheduler.js` - Main scheduler service
- `backend/lib/clients/vestaboardClient.js` - Vestaboard API client
- `frontend/src/pages/workflows/WorkflowManager.js` - Workflow management UI

### Sprint 6: Pin Screen Feature & Production Ready ✅
**Goal**: Pin screen wizard, production deployment, and monitoring
- [x] Pin Screen wizard with temporary workflow creation
- [x] Production deployment configuration
- [x] Environment management (TEST/PROD)
- [x] Monitoring and logging system
- [x] Error handling and recovery
- [x] Performance optimization

**Key Files Created**:
- `backend/lib/pinScreenService.js` - Pin screen functionality
- `frontend/src/pages/PinScreenWizard.js` - Pin screen wizard UI
- `vercel.json` - Production deployment configuration
- `backend/api/health.js` - Health check endpoint
- `scripts/deploy.js` - Deployment automation

## Architecture Overview

### Frontend (React + Tailwind)
```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── layout/          # Layout components
│   │   ├── auth/            # Authentication components
│   │   ├── forms/           # Form components
│   │   └── workflows/       # Workflow-specific components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   └── utils/               # Frontend utilities
```

### Backend (Node.js + Express + MongoDB)
```
backend/
├── api/                     # Vercel serverless functions
├── lib/
│   ├── clients/            # External API clients
│   ├── auth.js             # Authentication utilities
│   ├── screenEngine.js     # Core rendering engine
│   ├── scheduler.js        # Main scheduler service
│   └── workflowService.js  # Workflow logic
├── models/                 # MongoDB models
└── utils/                  # Backend utilities
```

### Key Features Implemented

#### 1. Authentication & Authorization
- JWT-based authentication with HTTP-only cookies
- Role-based access control (admin/editor/viewer)
- Secure password hashing with bcrypt
- Session management and logout functionality

#### 2. Screen Engine
- Complete Vestaboard character mapping (70 codes)
- Template-based rendering system
- Text alignment and wrapping utilities
- Live preview functionality
- Error handling with fallback screens

#### 3. Data Management
- Full CRUD operations for all data types:
  - Birthdays (firstName, date)
  - Checkrides (time, callsign, type, destination)
  - Upcoming Events (date, time, description)
  - Newest Pilot (name, isCurrent flag)
  - Employee Recognition (firstName, lastName, isCurrent flag)
  - Custom Messages (title, message, style, maxLines)

#### 4. External API Integration
- METAR weather data from aviationweather.gov
- OpenWeatherMap current conditions
- Intelligent caching with TTL (5 minutes)
- Graceful error handling with fallback data
- Template selection based on weather conditions

#### 5. Workflow System
- Complex scheduling system:
  - Always-on workflows
  - Daily time windows with day-of-week selection
  - Specific date ranges for temporary overrides
- Workflow steps with configurable display duration
- Board state tracking and step advancement
- Default workflow fallback system

#### 6. Scheduler Service
- Automated workflow execution via cron
- Board state management and persistence
- Matrix generation and Vestaboard API integration
- Error handling and recovery mechanisms
- Performance monitoring and metrics

#### 7. Pin Screen Feature
- Wizard-based UI for temporary screen overrides
- Automatic cleanup of expired pinned workflows
- Integration with existing workflow system
- Preview functionality before creation

#### 8. Production Features
- Health check endpoints
- Environment configuration management
- Monitoring and logging system
- Error tracking and metrics
- Automated deployment scripts
- Performance optimization

## Environment Variables Required

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-jwt-secret-key

# Application
NODE_ENV=development|production
FRONTEND_URL=http://localhost:3000

# Organization
ORG_ID=VBT
ORG_NAME=VBT

# External APIs
OPENWEATHER_API_KEY=your-key
OPENWEATHER_LOCATION=Bentonville,US

# Vestaboard API
VESTABOARD_TEST_API_KEY=your-test-key
VESTABOARD_PROD_API_KEY=your-prod-key

# Scheduler
CRON_SECRET=your-cron-secret
```

## Deployment Process

### Development
1. Clone repository
2. Run `npm run install:all`
3. Configure `.env.local` with development settings
4. Run `npm run dev`

### Production
1. Configure environment variables in Vercel
2. Set up MongoDB Atlas database
3. Configure Vestaboard API credentials
4. Run `npm run deploy`

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/users/me` - Get current user

### Data Management
- `GET|POST /api/birthdays` - Birthday CRUD
- `GET|POST /api/checkrides` - Checkride CRUD
- `GET|POST /api/events` - Event CRUD
- `GET|POST /api/pilots` - Pilot CRUD
- `GET|POST /api/recognitions` - Recognition CRUD
- `GET|POST /api/custom-messages` - Custom message CRUD

### Boards & Workflows
- `GET /api/boards` - List boards
- `GET /api/workflows` - List workflows by board
- `POST /api/workflows` - Create workflow
- `PATCH /api/workflows/:id` - Update workflow

### External Data
- `GET /api/external/weather` - Test weather API
- `POST /api/screens/preview` - Generate screen preview

### System
- `POST /api/system/run-scheduler` - Run scheduler (cron)
- `GET /api/health` - Health check

### Pin Screen
- `POST /api/pin-screen/create` - Create pinned workflow

## Success Criteria Met

✅ **Single Command Development**: `npm run dev` starts complete application
✅ **Single Command Deployment**: `npm run deploy` deploys to production
✅ **Complete Character Mapping**: All 70 Vestaboard character codes implemented
✅ **Full Authentication**: JWT-based auth with role-based permissions
✅ **All Screen Types**: Manual, external, and custom message screens
✅ **Workflow System**: Complete scheduling with overrides and pin screen
✅ **External APIs**: METAR and OpenWeather integration with caching
✅ **Production Ready**: Monitoring, logging, error handling, and deployment automation

The VBT Vestaboard System is now fully implemented and ready for production use!
