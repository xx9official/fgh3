const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: {
    type: String,
    enum: ['visitor', 'agent'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // null for visitor messages
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'audio', 'video']
    },
    url: String,
    name: String,
    size: Number
  }]
});

const chatSchema = new mongoose.Schema({
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true
  },
  visitorId: {
    type: String,
    required: true,
    index: true
  },
  visitorInfo: {
    name: {
      type: String,
      maxlength: 100
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: String,
    location: {
      country: String,
      city: String,
      timezone: String
    },
    userAgent: String,
    ipAddress: String,
    referrer: String,
    currentPage: String
  },
  messages: [messageSchema],
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['open', 'claimed', 'closed', 'resolved'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
  notes: {
    type: String,
    maxlength: 1000
  },
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    submittedAt: Date
  },
  metadata: {
    firstResponseTime: Number, // in seconds
    resolutionTime: Number, // in seconds
    totalMessages: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
chatSchema.index({ siteId: 1, status: 1 });
chatSchema.index({ siteId: 1, createdAt: -1 });
chatSchema.index({ claimedBy: 1 });
chatSchema.index({ visitorId: 1 });
chatSchema.index({ 'metadata.lastActivity': -1 });

// Pre-save middleware to update metadata
chatSchema.pre('save', function(next) {
  this.metadata.totalMessages = this.messages.length;
  this.metadata.lastActivity = new Date();
  
  // Calculate first response time
  if (this.messages.length > 0 && !this.metadata.firstResponseTime) {
    const firstVisitorMessage = this.messages.find(msg => msg.from === 'visitor');
    const firstAgentMessage = this.messages.find(msg => msg.from === 'agent');
    
    if (firstVisitorMessage && firstAgentMessage) {
      this.metadata.firstResponseTime = Math.floor(
        (firstAgentMessage.timestamp - firstVisitorMessage.timestamp) / 1000
      );
    }
  }
  
  next();
});

// Method to add message
chatSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.metadata.lastActivity = new Date();
  return this.save();
};

// Method to mark as claimed
chatSchema.methods.claim = function(agentId) {
  this.claimedBy = agentId;
  this.status = 'claimed';
  this.metadata.lastActivity = new Date();
  return this.save();
};

// Method to close chat
chatSchema.methods.close = function() {
  this.status = 'closed';
  this.metadata.lastActivity = new Date();
  return this.save();
};

// Method to resolve chat
chatSchema.methods.resolve = function() {
  this.status = 'resolved';
  this.metadata.lastActivity = new Date();
  if (!this.metadata.resolutionTime) {
    const firstMessage = this.messages[0];
    if (firstMessage) {
      this.metadata.resolutionTime = Math.floor(
        (new Date() - firstMessage.timestamp) / 1000
      );
    }
  }
  return this.save();
};

// Method to get unread message count for an agent
chatSchema.methods.getUnreadCount = function(agentId) {
  return this.messages.filter(msg => 
    msg.from === 'visitor' && !msg.isRead
  ).length;
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function(agentId) {
  this.messages.forEach(msg => {
    if (msg.from === 'visitor') {
      msg.isRead = true;
    }
  });
  return this.save();
};

// Method to get chat summary
chatSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    siteId: this.siteId,
    visitorId: this.visitorId,
    visitorInfo: this.visitorInfo,
    status: this.status,
    priority: this.priority,
    claimedBy: this.claimedBy,
    messageCount: this.messages.length,
    lastMessage: this.messages[this.messages.length - 1],
    createdAt: this.createdAt,
    lastActivity: this.metadata.lastActivity
  };
};

// Method to get public chat info (for widget)
chatSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    status: this.status,
    messages: this.messages.map(msg => ({
      from: msg.from,
      text: msg.text,
      timestamp: msg.timestamp,
      attachments: msg.attachments
    })),
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Chat', chatSchema); 