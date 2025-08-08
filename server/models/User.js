const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  role: {
    type: String,
    enum: ['owner', 'agent', 'zymo_admin'],
    default: 'owner'
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  teamSites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  }],
  avatar: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  }
}, {
  timestamps: true
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ teamSites: 1 });

// Method to set password and hash it
userSchema.methods.setPassword = async function(password) {
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(password, salt);
  return this;
};

// Pre-save middleware to hash password if _password is set
userSchema.pre('save', async function(next) {
  if (this._password) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this._password, salt);
      delete this._password; // Clear the temporary password
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to get public profile
userSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    email: this.email,
    name: this.name,
    role: this.role,
    avatar: this.avatar,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    createdAt: this.createdAt
  };
};

// Method to check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'zymo_admin';
};

// Method to check if user is site owner
userSchema.methods.isSiteOwner = function(siteId) {
  return this.role === 'owner' && this.teamSites.includes(siteId);
};

// Method to check if user is team member
userSchema.methods.isTeamMember = function(siteId) {
  return this.teamSites.includes(siteId);
};

module.exports = mongoose.model('User', userSchema); 