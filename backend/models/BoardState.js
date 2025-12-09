const mongoose = require('mongoose');
const { ORG_CONFIG } = require('../../shared/constants');

const boardStateSchema = new mongoose.Schema({
  stateId: {
    type: String,
    required: true,
    unique: true,
    default: () => `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: ORG_CONFIG.ID,
    uppercase: true
  },
  boardId: {
    type: String,
    required: true,
    ref: 'Vestaboard',
    unique: true
  },
  currentWorkflowId: {
    type: String,
    ref: 'Workflow'
  },
  currentStepIndex: {
    type: Number,
    default: 0
  },
  workflowRunning: {
    type: Boolean,
    default: false
  },
  currentScreenIndex: {
    type: Number,
    default: 0
  },
  currentScreenType: {
    type: String,
    default: null
  },
  lastScreenPostedAt: {
    type: Date
  },
  lastMatrix: {
    type: [[Number]],
    default: null
  },
  lastUpdateAt: {
    type: Date
  },
  nextScheduledTrigger: {
    type: Date
  },
  lastUpdateSuccess: {
    type: Boolean,
    default: true
  },
  lastError: {
    type: String
  },
  cycleCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'boardstates'
});

// Index for efficient queries
boardStateSchema.index({ orgId: 1, boardId: 1 });

module.exports = mongoose.model('BoardState', boardStateSchema);
