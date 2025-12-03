const mongoose = require('mongoose');
const { ORG_CONFIG } = require('../../shared/constants');

const birthdaySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => `bd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: ORG_CONFIG.ID,
    uppercase: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  date: {
    type: String,
    required: true,
    match: /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'birthdays'
});

// Index for efficient queries
birthdaySchema.index({ orgId: 1, date: 1 });

module.exports = mongoose.model('Birthday', birthdaySchema);
