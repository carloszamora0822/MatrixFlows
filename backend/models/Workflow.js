const mongoose = require('mongoose');
const { ORG_CONFIG } = require('../../shared/constants');

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
    enum: ['always', 'dailyWindow', 'specificDateRange'],
    default: 'always'
  },
  startTimeLocal: String, // HH:MM format
  endTimeLocal: String,   // HH:MM format
  daysOfWeek: [Number],   // 0=Sunday, 6=Saturday
  startDate: String,      // YYYY-MM-DD
  endDate: String,        // YYYY-MM-DD
  updateIntervalMinutes: {
    type: Number,
    required: true,
    default: 30,          // Default 30 minutes
    min: 1,               // Minimum 1 minute
    max: 1440             // Maximum 24 hours (1440 minutes)
  }
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
    default: ORG_CONFIG.ID,
    uppercase: true
  },
  // boardId removed - workflows are now independent and reusable
  // Boards reference workflows via defaultWorkflowId instead
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
    default: () => ({ type: 'always' })
  },
  steps: {
    type: [workflowStepSchema],
    default: []
  },
  createdBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'workflows'
});

// Index for efficient queries
workflowSchema.index({ orgId: 1, isActive: 1 });
workflowSchema.index({ orgId: 1, isDefault: 1 });

module.exports = mongoose.model('Workflow', workflowSchema);
