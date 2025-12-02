# VBT Vestaboard System - Sprint Plan

## Overview
This project will be built in 6 sprints, each delivering a working, testable increment of the VBT Vestaboard System.

## Technology Stack
- **Frontend**: React (JavaScript), Tailwind CSS
- **Backend**: Node.js/Express
- **Database**: MongoDB Atlas
- **Deployment**: Vercel (Frontend + Serverless Functions)
- **External APIs**: Vestaboard Write API, aviationweather.gov, OpenWeatherMap

## Commands
- **Development**: `npm run dev` - Runs the complete application in TEST mode
- **Deployment**: `npm run deploy` - Deploys the application to production

## Sprint Overview

### Sprint 1: Foundation & Authentication (Week 1)
**Goal**: Basic project structure, authentication system, and user management
**Deliverable**: Working login system with user roles and basic dashboard

### Sprint 2: Screen Engine & Character Mapping (Week 2)
**Goal**: Core rendering engine that converts screen configs to 6×22 matrices
**Deliverable**: Screen engine with preview capability and all character mappings

### Sprint 3: Manual Data Management (Week 3)
**Goal**: CRUD operations for all manual data types with screen previews
**Deliverable**: Complete data management UI for birthdays, checkrides, events, pilots, recognition

### Sprint 4: External Data & Weather Screens (Week 4)
**Goal**: Integration with external APIs and weather screen rendering
**Deliverable**: Working METAR and OpenWeather screens with caching

### Sprint 5: Workflows & Scheduling (Week 5)
**Goal**: Workflow creation, scheduling system, and board management
**Deliverable**: Complete workflow management with scheduler running

### Sprint 6: Pin Screen Feature & Production Ready (Week 6)
**Goal**: Pin screen wizard, production deployment, monitoring
**Deliverable**: Fully production-ready system with all features

## Success Criteria
After each sprint, the system should be:
1. **Runnable**: `npm run dev` starts the complete application
2. **Testable**: All implemented features work end-to-end
3. **Deployable**: Can be deployed to test environment
4. **Documented**: Clear documentation of implemented features

## Project Structure
```
MatrixFlow/
├── frontend/          # React application
├── backend/           # Node.js/Express API
├── shared/            # Shared utilities and types
├── docs/              # Documentation
├── scripts/           # Build and deployment scripts
└── sprints/           # Sprint planning and documentation
```
