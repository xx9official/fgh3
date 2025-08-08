const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  account: {
    name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    avatar: String
  },
  widget: {
    title: {
      type: String,
      default: 'Chat with us',
      maxlength: 50
    },
    buttonText: {
      type: String,
      default: 'Need help?',
      maxlength: 50
    },
    position: {
      type: String,
      enum: ['bottom-right', 'bottom-left'],
      default: 'bottom-right'
    },
    primaryColor: {
      type: String,
      default: '#3B82F6',
      match: [/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color']
    },
    logo: String
  },
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    browserNotifications: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    }
  },
  security: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    sessionTimeout: {
      type: Number,
      default: 24,
      min: 1,
      max: 168
    }
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  language: {
    type: String,
    default: 'en'
  }
}, {
  timestamps: true
});

// Index for performance
settingsSchema.index({ userId: 1 });

// Method to get public settings
settingsSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    account: this.account,
    widget: this.widget,
    notifications: this.notifications,
    security: this.security,
    theme: this.theme,
    language: this.language,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Settings', settingsSchema); 