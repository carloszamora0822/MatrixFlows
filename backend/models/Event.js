const mongoose = require('mongoose');
const { ORG_CONFIG } = require('../../shared/constants');

const eventSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: ORG_CONFIG.ID,
    uppercase: true
  },
  date: {
    type: String,
    required: true,
    match: /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/
  },
  time: {
    type: String,
    required: true,
    match: /^([01][0-9]|2[0-3]):[0-5][0-9]$/
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  createdBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'events'
});

// Index for efficient queries
eventSchema.index({ orgId: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
