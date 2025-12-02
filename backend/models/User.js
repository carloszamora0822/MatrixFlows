const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, ORG_CONFIG } = require('../../shared/constants');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  orgId: {
    type: String,
    required: true,
    default: ORG_CONFIG.ID,
    uppercase: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.EDITOR,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash password if it's been modified (or is new)
  if (!this.isModified('passwordHash')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw error;
  }
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLoginAt = new Date();
  return await this.save();
};

// Get user without sensitive data
userSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.__v;
  return userObject;
};

// Create default admin user
userSchema.statics.createDefaultAdmin = async function() {
  try {
    const adminExists = await this.findOne({ 
      role: USER_ROLES.ADMIN,
      orgId: ORG_CONFIG.ID 
    });
    
    if (!adminExists) {
      const defaultAdmin = new this({
        email: 'admin@vbt.com',
        passwordHash: 'admin123', // Will be hashed by pre-save hook
        role: USER_ROLES.ADMIN,
        orgId: ORG_CONFIG.ID
      });
      
      await defaultAdmin.save();
      console.log('✅ Default admin user created: admin@vbt.com / admin123');
      return defaultAdmin;
    }
    
    return adminExists;
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
    throw error;
  }
};

module.exports = mongoose.model('User', userSchema);
