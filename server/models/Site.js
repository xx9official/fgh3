const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  domain: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    set: function(value) {
      // Remove http:// or https:// if present
      return value.replace(/^https?:\/\//, '');
    },
    match: [/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/, 'Please enter a valid domain']
  },
  customization: {
    color: {
      type: String,
      default: '#0088ff',
      match: [/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color']
    },
    position: {
      type: String,
      enum: ['right', 'left'],
      default: 'right'
    },
    navbarTitle: {
      type: String,
      default: 'Chat with us',
      maxlength: 50
    },
    welcomeMessage: {
      type: String,
      default: 'Hello! How can we help you today?',
      maxlength: 200
    },
    offlineMessage: {
      type: String,
      default: 'We are currently offline. Please leave a message and we\'ll get back to you.',
      maxlength: 200
    }
  },
  team: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'agent'],
      default: 'agent'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    acceptedAt: Date
  }],
  settings: {
    isActive: {
      type: Boolean,
      default: true
    },
    requireEmail: {
      type: Boolean,
      default: false
    },
    autoAssign: {
      type: Boolean,
      default: true
    },
    workingHours: {
      enabled: {
        type: Boolean,
        default: false
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      schedule: {
        monday: { start: String, end: String, enabled: Boolean },
        tuesday: { start: String, end: String, enabled: Boolean },
        wednesday: { start: String, end: String, enabled: Boolean },
        thursday: { start: String, end: String, enabled: Boolean },
        friday: { start: String, end: String, enabled: Boolean },
        saturday: { start: String, end: String, enabled: Boolean },
        sunday: { start: String, end: String, enabled: Boolean }
      }
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      browser: {
        type: Boolean,
        default: true
      }
    }
  },
  stats: {
    totalChats: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    avgResponseTime: {
      type: Number,
      default: 0
    },
    satisfactionRate: {
      type: Number,
      default: 0
    }
  },
  widgetCode: {
    type: String,
    unique: true,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
siteSchema.index({ ownerId: 1 });
siteSchema.index({ domain: 1 });
siteSchema.index({ widgetCode: 1 });
siteSchema.index({ 'team.userId': 1 });

// Pre-save middleware to generate widget code
siteSchema.pre('save', function(next) {
  if (!this.widgetCode) {
    this.widgetCode = `site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Pre-validate middleware to ensure widgetCode is set
siteSchema.pre('validate', function(next) {
  if (!this.widgetCode) {
    this.widgetCode = `site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Method to get widget embed code
siteSchema.methods.getEmbedCode = function() {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://cdn.zymo.chat' 
          : process.env.BASE_URL || 'http://localhost:5000';
  
  return `<script src="${baseUrl}/widget.js" data-site-id="${this.widgetCode}" data-color="${this.customization.color}" data-position="${this.customization.position}"></script>`;
};

// Method to check if user has access
siteSchema.methods.hasUserAccess = function(userId) {
  return this.ownerId.equals(userId) || 
         this.team.some(member => member.userId.equals(userId));
};

// Method to get user role in this site
siteSchema.methods.getUserRole = function(userId) {
  if (this.ownerId.equals(userId)) return 'owner';
  const teamMember = this.team.find(member => member.userId.equals(userId));
  return teamMember ? teamMember.role : null;
};

// Method to add team member
siteSchema.methods.addTeamMember = function(userId, role = 'agent') {
  const existingMember = this.team.find(member => member.userId.equals(userId));
  if (!existingMember) {
    this.team.push({
      userId,
      role,
      invitedAt: new Date()
    });
  }
  return this.save();
};

// Method to remove team member
siteSchema.methods.removeTeamMember = function(userId) {
  this.team = this.team.filter(member => !member.userId.equals(userId));
  return this.save();
};

// Method to update team member role
siteSchema.methods.updateTeamMemberRole = function(userId, newRole) {
  const member = this.team.find(member => member.userId.equals(userId));
  if (member) {
    member.role = newRole;
  }
  return this.save();
};

// Method to get public site info
siteSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    name: this.name,
    domain: this.domain,
    widgetCode: this.widgetCode,
    customization: this.customization,
    settings: {
      isActive: this.settings.isActive,
      workingHours: this.settings.workingHours
    },
    stats: this.stats,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Site', siteSchema); 