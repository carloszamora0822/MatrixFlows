# Sprint 6: Pin Screen Feature & Production Ready

## Goal
Implement the "Pin Screen" wizard, finalize production deployment configuration, add monitoring, and ensure the system is fully production-ready.

## Duration
1 Week

## Deliverables
- Pin Screen wizard with temporary workflow creation
- Production deployment configuration
- Environment management (TEST/PROD)
- Monitoring and logging system
- Error handling and recovery
- Documentation and user guides
- Performance optimization

## Requirements

### 1. Pin Screen Wizard

#### Pin Screen Service
```javascript
// backend/lib/pinScreenService.js
const Workflow = require('../models/Workflow');
const moment = require('moment-timezone');

class PinScreenService {
  async createPinnedWorkflow({
    boardId,
    screenConfigs, // Array of {screenType, screenConfig, displaySeconds}
    startDate,
    endDate,
    startTimeLocal,
    endTimeLocal,
    createdBy
  }) {
    // Generate unique workflow name
    const workflowName = `Pinned - ${moment().format('MM/DD HH:mm')}`;

    // Create workflow steps
    const steps = screenConfigs.map((config, index) => ({
      order: index + 1,
      screenType: config.screenType,
      screenConfig: config.screenConfig || {},
      displaySeconds: config.displaySeconds || 20,
      isEnabled: true
    }));

    // Create workflow with specific date range schedule
    const workflow = new Workflow({
      orgId: 'VBT',
      boardId,
      name: workflowName,
      isDefault: false,
      isActive: true,
      schedule: {
        type: 'specificDateRange',
        startDate,
        endDate,
        startTimeLocal,
        endTimeLocal,
        daysOfWeek: [] // All days in range
      },
      steps
    });

    await workflow.save();
    return workflow;
  }

  async cleanupExpiredPinnedWorkflows() {
    const now = moment().tz('America/Chicago');
    const currentDate = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');

    // Find expired pinned workflows
    const expiredWorkflows = await Workflow.find({
      orgId: 'VBT',
      isDefault: false,
      isActive: true,
      name: { $regex: /^Pinned -/ },
      $or: [
        { 'schedule.endDate': { $lt: currentDate } },
        {
          'schedule.endDate': currentDate,
          'schedule.endTimeLocal': { $lte: currentTime }
        }
      ]
    });

    console.log(`Found ${expiredWorkflows.length} expired pinned workflows`);

    // Deactivate expired workflows
    for (const workflow of expiredWorkflows) {
      workflow.isActive = false;
      await workflow.save();
      console.log(`Deactivated expired pinned workflow: ${workflow.name}`);
    }

    return expiredWorkflows.length;
  }
}

module.exports = new PinScreenService();
```

#### Pin Screen API
```javascript
// backend/api/pin-screen/create.js
const { connectDB } = require('../../lib/db');
const { requireAuth, requireRole } = require('../../lib/auth');
const pinScreenService = require('../../lib/pinScreenService');
const { validatePinScreenInput } = require('../../lib/validation');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    await connectDB();
    
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      requireRole(['admin', 'editor'])(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const validation = validatePinScreenInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { fieldErrors: validation.errors }
        }
      });
    }

    const workflow = await pinScreenService.createPinnedWorkflow({
      ...req.body,
      createdBy: req.user.userId
    });

    res.status(201).json({
      workflowId: workflow.workflowId,
      name: workflow.name,
      schedule: workflow.schedule,
      steps: workflow.steps.length
    });

  } catch (error) {
    console.error('Pin screen creation error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create pinned screen'
      }
    });
  }
};
```

#### Pin Screen Wizard UI
```javascript
// frontend/src/pages/PinScreenWizard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StepIndicator from '../components/ui/StepIndicator';
import BoardSelector from '../components/pin-screen/BoardSelector';
import ScreenSelector from '../components/pin-screen/ScreenSelector';
import ScheduleSelector from '../components/pin-screen/ScheduleSelector';
import PinScreenPreview from '../components/pin-screen/PinScreenPreview';

const PinScreenWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    boardId: '',
    screenConfigs: [],
    startDate: '',
    endDate: '',
    startTimeLocal: '09:00',
    endTimeLocal: '17:00'
  });

  const steps = [
    { id: 1, name: 'Choose Board', description: 'Select target Vestaboard' },
    { id: 2, name: 'Choose Screens', description: 'Select screen types to display' },
    { id: 3, name: 'Set Schedule', description: 'Configure date and time window' },
    { id: 4, name: 'Review & Create', description: 'Preview and confirm settings' }
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/pin-screen/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        navigate('/workflows', { 
          state: { message: 'Pinned screen created successfully!' }
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.error?.message || 'Failed to create pinned screen'}`);
      }
    } catch (error) {
      alert('Network error occurred');
    }
  };

  const updateFormData = (updates) => {
    setFormData({ ...formData, ...updates });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.boardId;
      case 2: return formData.screenConfigs.length > 0;
      case 3: return formData.startDate && formData.endDate;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Pin Screen Wizard</h1>
            <p className="mt-2 text-gray-600">
              Temporarily override a board's workflow with specific screens
            </p>
          </div>

          <StepIndicator steps={steps} currentStep={currentStep} />

          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-6 py-8">
              {currentStep === 1 && (
                <BoardSelector
                  selectedBoardId={formData.boardId}
                  onBoardSelect={(boardId) => updateFormData({ boardId })}
                />
              )}

              {currentStep === 2 && (
                <ScreenSelector
                  screenConfigs={formData.screenConfigs}
                  onScreenConfigsChange={(screenConfigs) => updateFormData({ screenConfigs })}
                />
              )}

              {currentStep === 3 && (
                <ScheduleSelector
                  schedule={{
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    startTimeLocal: formData.startTimeLocal,
                    endTimeLocal: formData.endTimeLocal
                  }}
                  onScheduleChange={(schedule) => updateFormData(schedule)}
                />
              )}

              {currentStep === 4 && (
                <PinScreenPreview
                  formData={formData}
                />
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Create Pinned Screen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PinScreenWizard;
```

### 2. Production Configuration

#### Environment Configuration
```javascript
// scripts/setup-env.js
const fs = require('fs');
const path = require('path');

const environments = {
  development: {
    MONGODB_URI: 'mongodb://localhost:27017/vbt-vestaboard-dev',
    JWT_SECRET: 'dev-jwt-secret-change-in-production',
    NODE_ENV: 'development',
    FRONTEND_URL: 'http://localhost:3000',
    OPENWEATHER_API_KEY: 'your-dev-api-key',
    OPENWEATHER_LOCATION: 'Bentonville,US',
    VESTABOARD_TEST_API_KEY: 'your-test-key',
    CRON_SECRET: 'dev-cron-secret'
  },
  production: {
    MONGODB_URI: 'mongodb+srv://username:password@cluster.mongodb.net/vbt-vestaboard-prod',
    JWT_SECRET: 'CHANGE-THIS-IN-PRODUCTION',
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://your-domain.vercel.app',
    OPENWEATHER_API_KEY: 'your-prod-api-key',
    OPENWEATHER_LOCATION: 'Bentonville,US',
    VESTABOARD_PROD_API_KEY: 'your-prod-key',
    CRON_SECRET: 'CHANGE-THIS-IN-PRODUCTION'
  }
};

const createEnvFile = (env) => {
  const config = environments[env];
  if (!config) {
    console.error(`Unknown environment: ${env}`);
    process.exit(1);
  }

  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const filename = env === 'development' ? '.env.local' : `.env.${env}`;
  fs.writeFileSync(filename, envContent);
  console.log(`Created ${filename}`);
};

const env = process.argv[2] || 'development';
createEnvFile(env);
```

#### Vercel Configuration
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    },
    {
      "src": "backend/api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ],
  "functions": {
    "backend/api/**/*.js": {
      "maxDuration": 30
    }
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

### 3. Monitoring and Logging

#### Health Check Endpoint
```javascript
// backend/api/health.js
const { connectDB } = require('../lib/db');
const Vestaboard = require('../models/Vestaboard');

module.exports = async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  };

  try {
    // Database connectivity
    await connectDB();
    const boardCount = await Vestaboard.countDocuments();
    healthCheck.checks.database = {
      status: 'ok',
      boardCount
    };

    // Environment variables
    const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'OPENWEATHER_API_KEY'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    healthCheck.checks.environment = {
      status: missingEnvVars.length === 0 ? 'ok' : 'warning',
      missingVariables: missingEnvVars
    };

    // Overall status
    const hasErrors = Object.values(healthCheck.checks).some(check => check.status === 'error');
    healthCheck.status = hasErrors ? 'error' : 'ok';

    const statusCode = healthCheck.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    healthCheck.status = 'error';
    healthCheck.checks.database = {
      status: 'error',
      error: error.message
    };
    
    res.status(503).json(healthCheck);
  }
};
```

#### Enhanced Scheduler with Monitoring
```javascript
// backend/lib/scheduler.js (enhanced version)
const Vestaboard = require('../models/Vestaboard');
const BoardState = require('../models/BoardState');
const workflowService = require('./workflowService');
const screenEngine = require('./screenEngine');
const vestaboardClient = require('./clients/vestaboardClient');
const pinScreenService = require('./pinScreenService');

class Scheduler {
  constructor() {
    this.metrics = {
      totalRuns: 0,
      successfulRuns: 0,
      errors: [],
      lastRun: null,
      boardsProcessed: 0,
      matricesSent: 0
    };
  }

  async runScheduler() {
    const startTime = Date.now();
    this.metrics.totalRuns++;
    this.metrics.lastRun = new Date().toISOString();

    console.log(`[${this.metrics.lastRun}] Starting scheduler run #${this.metrics.totalRuns}`);
    
    try {
      // Cleanup expired pinned workflows
      await pinScreenService.cleanupExpiredPinnedWorkflows();

      // Process active boards
      const boards = await Vestaboard.find({ isActive: true, orgId: 'VBT' });
      console.log(`Found ${boards.length} active boards`);

      let boardsProcessed = 0;
      let matricesSent = 0;

      for (const board of boards) {
        try {
          const result = await this.processBoard(board);
          boardsProcessed++;
          if (result.matrixSent) {
            matricesSent++;
          }
        } catch (error) {
          this.logError(`Board ${board.name}`, error);
        }
      }

      this.metrics.successfulRuns++;
      this.metrics.boardsProcessed = boardsProcessed;
      this.metrics.matricesSent = matricesSent;

      const duration = Date.now() - startTime;
      console.log(`Scheduler run completed in ${duration}ms - Processed: ${boardsProcessed}, Sent: ${matricesSent}`);

    } catch (error) {
      this.logError('Scheduler', error);
      throw error;
    }
  }

  async processBoard(board) {
    console.log(`Processing board: ${board.name}`);

    const activeWorkflow = await workflowService.getActiveWorkflow(board.boardId);
    if (!activeWorkflow) {
      console.log(`No active workflow for board ${board.name}`);
      return { matrixSent: false };
    }

    let boardState = await BoardState.findOne({ boardId: board.boardId });
    if (!boardState) {
      boardState = new BoardState({ boardId: board.boardId });
    }

    // Check if workflow changed
    if (boardState.workflowId !== activeWorkflow.workflowId) {
      console.log(`Workflow changed for ${board.name}: ${boardState.workflowId} -> ${activeWorkflow.workflowId}`);
      boardState.workflowId = activeWorkflow.workflowId;
      boardState.currentStepId = null;
      boardState.lastRenderedAt = null;
    }

    const currentStep = workflowService.getNextStep(activeWorkflow, boardState.currentStepId);
    if (!currentStep) {
      console.log(`No enabled steps in workflow for ${board.name}`);
      return { matrixSent: false };
    }

    // Check if it's time to advance
    const now = new Date();
    const shouldAdvance = !boardState.lastRenderedAt || 
      (now - boardState.lastRenderedAt) >= (currentStep.displaySeconds * 1000);

    if (!shouldAdvance) {
      console.log(`Not time to advance step for ${board.name}`);
      return { matrixSent: false };
    }

    // Render and send matrix
    console.log(`Rendering step ${currentStep.stepId} (${currentStep.screenType}) for ${board.name}`);
    const matrix = await screenEngine.render(currentStep.screenType, currentStep.screenConfig);
    
    await vestaboardClient.sendMatrix(board, matrix);

    // Update board state
    boardState.currentStepId = currentStep.stepId;
    boardState.lastRenderedAt = now;
    boardState.lastMatrix = matrix;
    await boardState.save();

    console.log(`Successfully updated ${board.name}`);
    return { matrixSent: true };
  }

  logError(context, error) {
    const errorLog = {
      context,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    this.metrics.errors.push(errorLog);
    
    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }

    console.error(`[${context}] Error:`, error);
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }
}

module.exports = new Scheduler();
```

### 4. Deployment Scripts

#### Build and Deploy Script
```javascript
// scripts/deploy.js
const { execSync } = require('child_process');
const fs = require('fs');

const deploy = async (environment = 'production') => {
  console.log(`Deploying to ${environment}...`);

  try {
    // Verify environment
    if (!['production', 'staging'].includes(environment)) {
      throw new Error('Invalid environment. Use "production" or "staging"');
    }

    // Check for required files
    const requiredFiles = ['.env.production', 'vercel.json'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    // Install dependencies
    console.log('Installing dependencies...');
    execSync('npm run install:all', { stdio: 'inherit' });

    // Build frontend
    console.log('Building frontend...');
    execSync('npm run build:frontend', { stdio: 'inherit' });

    // Deploy to Vercel
    console.log('Deploying to Vercel...');
    const deployCommand = environment === 'production' ? 
      'vercel --prod --yes' : 
      'vercel --yes';
    
    execSync(deployCommand, { stdio: 'inherit' });

    console.log(`✅ Deployment to ${environment} completed successfully!`);

  } catch (error) {
    console.error(`❌ Deployment failed:`, error.message);
    process.exit(1);
  }
};

const environment = process.argv[2] || 'production';
deploy(environment);
```

## Testing Checklist
- [ ] Pin screen wizard creates temporary workflows
- [ ] Expired pinned workflows are cleaned up
- [ ] Production environment variables configured
- [ ] Health check endpoint functional
- [ ] Monitoring and metrics working
- [ ] Deployment scripts tested
- [ ] Error handling and recovery working
- [ ] Performance optimization complete

## Definition of Done
- Pin screen feature fully functional
- Production deployment configuration complete
- Monitoring and logging implemented
- Error handling and recovery mechanisms in place
- Performance optimized for production use
- Documentation complete
- System ready for production deployment
- All features tested end-to-end
