# Sprint 5: Workflows & Scheduling

## Goal
Implement the complete workflow system with scheduling, board management, and the scheduler service that orchestrates Vestaboard updates.

## Duration
1 Week

## Deliverables
- Vestaboard and Workflow database models
- Workflow CRUD operations with scheduling
- Board management system
- Scheduler service with cron integration
- Vestaboard API client
- Workflow management UI
- Board state tracking

## Requirements

### 1. Database Models

#### Vestaboard Model
```javascript
// backend/models/Vestaboard.js
const mongoose = require('mongoose');

const vestaboardSchema = new mongoose.Schema({
  boardId: {
    type: String,
    required: true,
    unique: true,
    default: () => `b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: 'VBT'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  locationLabel: {
    type: String,
    trim: true
  },
  vestaboardWriteKey: {
    type: String,
    required: true
  },
  defaultWorkflowId: {
    type: String,
    ref: 'Workflow'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vestaboard', vestaboardSchema);
```

#### Workflow Model
```javascript
// backend/models/Workflow.js
const mongoose = require('mongoose');

const workflowStepSchema = new mongoose.Schema({
  stepId: {
    type: String,
    required: true,
    default: () => `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  order: {
    type: Number,
    required: true
  },
  screenType: {
    type: String,
    required: true,
    enum: ['BIRTHDAY', 'CHECKRIDES', 'UPCOMING_EVENTS', 'NEWEST_PILOT', 'EMPLOYEE_RECOGNITION', 'METAR', 'WEATHER', 'CUSTOM_MESSAGE']
  },
  screenConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  displaySeconds: {
    type: Number,
    required: true,
    min: 5,
    max: 300,
    default: 15
  },
  isEnabled: {
    type: Boolean,
    default: true
  }
});

const workflowScheduleSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['always', 'dailyWindow', 'specificDateRange']
  },
  startTimeLocal: String,
  endTimeLocal: String,
  daysOfWeek: [Number],
  startDate: String,
  endDate: String
}, { _id: false });

const workflowSchema = new mongoose.Schema({
  workflowId: {
    type: String,
    required: true,
    unique: true,
    default: () => `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: 'VBT'
  },
  boardId: {
    type: String,
    required: true,
    ref: 'Vestaboard'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  schedule: {
    type: workflowScheduleSchema,
    required: true,
    default: { type: 'always' }
  },
  steps: [workflowStepSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Workflow', workflowSchema);
```

#### Board State Model
```javascript
// backend/models/BoardState.js
const mongoose = require('mongoose');

const boardStateSchema = new mongoose.Schema({
  boardId: {
    type: String,
    required: true,
    unique: true,
    ref: 'Vestaboard'
  },
  workflowId: {
    type: String,
    ref: 'Workflow'
  },
  currentStepId: String,
  lastRenderedAt: Date,
  lastMatrix: [[Number]]
}, {
  timestamps: true
});

module.exports = mongoose.model('BoardState', boardStateSchema);
```

### 2. Vestaboard API Client
```javascript
// backend/lib/clients/vestaboardClient.js
const axios = require('axios');

class VestaboardClient {
  constructor() {
    this.baseURL = 'https://rw.vestaboard.com';
  }

  async sendMatrix(board, matrix) {
    if (!board.vestaboardWriteKey) {
      throw new Error(`No write key configured for board ${board.boardId}`);
    }

    if (!this.validateMatrix(matrix)) {
      throw new Error('Invalid matrix format');
    }

    try {
      console.log(`Sending matrix to board ${board.name} (${board.boardId})`);
      
      const response = await axios.post(`${this.baseURL}/`, matrix, {
        headers: {
          'X-Vestaboard-Read-Write-Key': board.vestaboardWriteKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      console.log(`Successfully sent matrix to ${board.name}`);
      return response.data;

    } catch (error) {
      console.error(`Failed to send matrix to ${board.name}:`, error.message);
      throw new Error(`Vestaboard API error: ${error.message}`);
    }
  }

  validateMatrix(matrix) {
    if (!Array.isArray(matrix) || matrix.length !== 6) {
      return false;
    }

    for (const row of matrix) {
      if (!Array.isArray(row) || row.length !== 22) {
        return false;
      }
      for (const cell of row) {
        if (!Number.isInteger(cell) || cell < 0 || cell > 70) {
          return false;
        }
      }
    }

    return true;
  }
}

module.exports = new VestaboardClient();
```

### 3. Workflow Service
```javascript
// backend/lib/workflowService.js
const Workflow = require('../models/Workflow');
const moment = require('moment-timezone');

class WorkflowService {
  async getActiveWorkflow(boardId, timestamp = new Date()) {
    const workflows = await Workflow.find({
      boardId,
      isActive: true,
      orgId: 'VBT'
    }).sort({ updatedAt: -1 });

    if (!workflows.length) {
      return null;
    }

    // Find matching scheduled workflows (non-default first)
    const nonDefaultWorkflows = workflows.filter(w => !w.isDefault);
    for (const workflow of nonDefaultWorkflows) {
      if (this.isWorkflowActive(workflow, timestamp)) {
        return workflow;
      }
    }

    // Fall back to default workflow
    const defaultWorkflow = workflows.find(w => w.isDefault);
    if (defaultWorkflow && this.isWorkflowActive(defaultWorkflow, timestamp)) {
      return defaultWorkflow;
    }

    return null;
  }

  isWorkflowActive(workflow, timestamp) {
    const schedule = workflow.schedule;
    const now = moment(timestamp).tz('America/Chicago'); // VBT timezone

    switch (schedule.type) {
      case 'always':
        return true;

      case 'dailyWindow':
        return this.isDailyWindowActive(schedule, now);

      case 'specificDateRange':
        return this.isDateRangeActive(schedule, now);

      default:
        return false;
    }
  }

  isDailyWindowActive(schedule, now) {
    const dayOfWeek = now.day(); // 0 = Sunday
    if (!schedule.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }

    const currentTime = now.format('HH:mm');
    return currentTime >= schedule.startTimeLocal && currentTime < schedule.endTimeLocal;
  }

  isDateRangeActive(schedule, now) {
    const currentDate = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');

    if (currentDate < schedule.startDate || currentDate > schedule.endDate) {
      return false;
    }

    if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
      const dayOfWeek = now.day();
      if (!schedule.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    return currentTime >= schedule.startTimeLocal && currentTime < schedule.endTimeLocal;
  }

  getNextStep(workflow, currentStepId) {
    const enabledSteps = workflow.steps.filter(step => step.isEnabled);
    if (!enabledSteps.length) {
      return null;
    }

    if (!currentStepId) {
      return enabledSteps[0];
    }

    const currentIndex = enabledSteps.findIndex(step => step.stepId === currentStepId);
    if (currentIndex === -1) {
      return enabledSteps[0];
    }

    const nextIndex = (currentIndex + 1) % enabledSteps.length;
    return enabledSteps[nextIndex];
  }
}

module.exports = new WorkflowService();
```

### 4. Scheduler Service
```javascript
// backend/lib/scheduler.js
const Vestaboard = require('../models/Vestaboard');
const BoardState = require('../models/BoardState');
const workflowService = require('./workflowService');
const screenEngine = require('./screenEngine');
const vestaboardClient = require('./clients/vestaboardClient');

class Scheduler {
  async runScheduler() {
    console.log('Running scheduler...');
    
    try {
      const boards = await Vestaboard.find({ isActive: true, orgId: 'VBT' });
      console.log(`Found ${boards.length} active boards`);

      for (const board of boards) {
        await this.processBoard(board);
      }

      console.log('Scheduler run completed');
    } catch (error) {
      console.error('Scheduler error:', error);
      throw error;
    }
  }

  async processBoard(board) {
    try {
      console.log(`Processing board: ${board.name}`);

      // Get active workflow
      const activeWorkflow = await workflowService.getActiveWorkflow(board.boardId);
      if (!activeWorkflow) {
        console.log(`No active workflow for board ${board.name}`);
        return;
      }

      // Get or create board state
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

      // Determine current step
      const currentStep = workflowService.getNextStep(activeWorkflow, boardState.currentStepId);
      if (!currentStep) {
        console.log(`No enabled steps in workflow for ${board.name}`);
        return;
      }

      // Check if it's time to advance
      const now = new Date();
      const shouldAdvance = !boardState.lastRenderedAt || 
        (now - boardState.lastRenderedAt) >= (currentStep.displaySeconds * 1000);

      if (!shouldAdvance) {
        console.log(`Not time to advance step for ${board.name}`);
        return;
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

    } catch (error) {
      console.error(`Error processing board ${board.name}:`, error);
    }
  }
}

module.exports = new Scheduler();
```

### 5. Scheduler API Endpoint
```javascript
// backend/api/system/run-scheduler.js
const { connectDB } = require('../../lib/db');
const scheduler = require('../../lib/scheduler');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  // Verify cron secret
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } });
  }

  try {
    await connectDB();
    await scheduler.runScheduler();
    
    res.status(200).json({ 
      success: true, 
      message: 'Scheduler run completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scheduler endpoint error:', error);
    res.status(500).json({
      error: {
        code: 'SCHEDULER_ERROR',
        message: error.message
      }
    });
  }
};
```

### 6. Workflow Management UI
```javascript
// frontend/src/pages/workflows/WorkflowManager.js
import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import WorkflowList from '../../components/workflows/WorkflowList';
import WorkflowEditor from '../../components/workflows/WorkflowEditor';

const WorkflowManager = () => {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      fetchWorkflows(selectedBoard.boardId);
    }
  }, [selectedBoard]);

  const fetchBoards = async () => {
    try {
      const response = await fetch('/api/boards', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setBoards(data);
        if (data.length > 0) {
          setSelectedBoard(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflows = async (boardId) => {
    try {
      const response = await fetch(`/api/workflows?boardId=${boardId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
        setSelectedWorkflow(data.find(w => w.isDefault) || data[0] || null);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Workflow Management</h1>
            <p className="mt-2 text-gray-600">Configure display workflows for your Vestaboards</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Board Selector */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Select Board</h2>
                <div className="space-y-2">
                  {boards.map((board) => (
                    <button
                      key={board.boardId}
                      onClick={() => setSelectedBoard(board)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        selectedBoard?.boardId === board.boardId
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium">{board.name}</div>
                      <div className="text-xs text-gray-500">{board.locationLabel}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Workflow List */}
            <div className="lg:col-span-1">
              {selectedBoard && (
                <WorkflowList
                  workflows={workflows}
                  selectedWorkflow={selectedWorkflow}
                  onSelectWorkflow={setSelectedWorkflow}
                  boardId={selectedBoard.boardId}
                  onWorkflowsChanged={() => fetchWorkflows(selectedBoard.boardId)}
                />
              )}
            </div>

            {/* Workflow Editor */}
            <div className="lg:col-span-2">
              {selectedWorkflow && (
                <WorkflowEditor
                  workflow={selectedWorkflow}
                  onWorkflowChanged={() => fetchWorkflows(selectedBoard.boardId)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default WorkflowManager;
```

## Testing Checklist
- [ ] Workflow CRUD operations working
- [ ] Schedule evaluation logic correct
- [ ] Scheduler service runs without errors
- [ ] Vestaboard API client sends matrices
- [ ] Board state tracking functional
- [ ] Workflow management UI working
- [ ] Step advancement logic correct
- [ ] Cron endpoint secured and functional

## Definition of Done
- Complete workflow system implemented
- Scheduler service operational
- Board management functional
- Workflow UI for configuration
- Vestaboard API integration working
- Schedule evaluation accurate
- Board state persistence working
- System ready for automated operation
