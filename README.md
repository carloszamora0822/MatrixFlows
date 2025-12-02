# VBT Vestaboard System

A complete workflow management system for VBT's Vestaboard displays, built with React, Node.js, and MongoDB.

## 🚀 Quick Start

### Development
```bash
# Clone and setup
git clone https://github.com/carloszamora0822/MatrixFlows.git
cd MatrixFlows

# Install all dependencies
npm run install:all

# Copy environment template and configure
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### Deployment
```bash
# Deploy to production
npm run deploy
```

## 📋 Features

- **Authentication & Authorization** - JWT-based auth with role-based permissions
- **Screen Engine** - Converts content to 6×22 Vestaboard matrices
- **Data Management** - CRUD for birthdays, checkrides, events, pilots, recognition
- **External APIs** - METAR weather and OpenWeatherMap integration
- **Workflow System** - Complex scheduling with overrides and temporary pins
- **Pin Screen** - Wizard for temporary workflow overrides
- **Production Ready** - Monitoring, logging, error handling

## 🏗️ Architecture

- **Frontend**: React with Tailwind CSS
- **Backend**: Node.js/Express with Vercel serverless functions
- **Database**: MongoDB Atlas
- **Deployment**: Vercel with automated deployments

## 📖 Development Guide

### Branch Strategy
- `main` - Production environment
- `test` - Staging/test environment  
- `develop` - Active development
- `feature/*` - Feature branches

### Sprint Development
This project is built in 6 sprints:

1. **Sprint 1**: Foundation & Authentication
2. **Sprint 2**: Screen Engine & Character Mapping
3. **Sprint 3**: Manual Data Management
4. **Sprint 4**: External Data & Weather Screens
5. **Sprint 5**: Workflows & Scheduling
6. **Sprint 6**: Pin Screen Feature & Production Ready

See `/sprints/` folder for detailed sprint documentation.

### Environment Variables
Copy `.env.example` to `.env.local` and configure:

```bash
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
OPENWEATHER_API_KEY=your-openweather-api-key
VESTABOARD_API_KEY=your-vestaboard-api-key
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/users/me` - Get current user

### Data Management
- `GET|POST /api/birthdays` - Birthday management
- `GET|POST /api/checkrides` - Checkride management
- `GET|POST /api/events` - Event management
- `GET|POST /api/custom-messages` - Custom message management

### Workflows
- `GET /api/boards` - List boards
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `POST /api/pin-screen/create` - Create pinned screen

### System
- `POST /api/system/run-scheduler` - Run scheduler (cron)
- `GET /api/health` - Health check

## 📱 Screen Types

The system supports multiple screen types:
- **Birthday** - Birthday announcements
- **Checkrides** - Flight checkride schedules
- **Upcoming Events** - Event listings
- **Newest Pilot** - New pilot announcements
- **Employee Recognition** - Staff recognition
- **METAR** - Aviation weather data
- **Weather** - Current weather conditions
- **Custom Message** - User-defined messages with borders

## 🎨 Vestaboard Character Mapping

Complete support for all 70 Vestaboard character codes:
- Letters A-Z (codes 1-26)
- Numbers 0-9 (codes 27-36)
- Special characters and punctuation
- Color codes (Red, Orange, Yellow, Green, Blue, Violet, White, Black)

## 📊 Monitoring

- Health check endpoint at `/api/health`
- Scheduler metrics and error tracking
- Environment variable validation
- Database connectivity monitoring

## 🔒 Security

- JWT authentication with HTTP-only cookies
- Role-based authorization (admin/editor/viewer)
- Environment variable protection
- API rate limiting
- Input validation and sanitization

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Create feature branch from `develop`
2. Follow sprint documentation in `/sprints/`
3. Test thoroughly with `npm run dev`
4. Create pull request to `develop`
5. After review, merge through `test` to `main`
