const mongoose = require('mongoose');
const { ORG_CONFIG } = require('../../shared/constants');

const checkrideSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => `cr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: ORG_CONFIG.ID,
    uppercase: true
  },
  time: {
    type: String,
    required: true,
    match: /^([01][0-9]|2[0-3]):[0-5][0-9]$/
  },
  name: {
    type: String,
    required: true,
    maxlength: 20,
    trim: true
  },
  callsign: {
    type: String,
    required: true,
    maxlength: 10,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    required: true,
    enum: ['PPL', 'IFR', 'COMMERCIAL', 'CFI', 'CFII', 'MEI'],
    uppercase: true
  },
  date: {
    type: String,
    required: true,
    match: /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/
  },
  borderColor1: {
    type: String,
    default: 'red'
  },
  createdBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'checkrides'
});

// Index for efficient queries
checkrideSchema.index({ orgId: 1, date: 1 });

module.exports = mongoose.model('Checkride', checkrideSchema);
