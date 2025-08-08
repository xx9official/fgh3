const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  metrics: {
    totalChats: {
      type: Number,
      default: 0
    },
    activeChats: {
      type: Number,
      default: 0
    },
    closedChats: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    visitorMessages: {
      type: Number,
      default: 0
    },
    agentMessages: {
      type: Number,
      default: 0
    },
    avgResponseTime: {
      type: Number,
      default: 0
    },
    avgResolutionTime: {
      type: Number,
      default: 0
    },
    satisfactionRate: {
      type: Number,
      default: 0
    },
    uniqueVisitors: {
      type: Number,
      default: 0
    },
    returningVisitors: {
      type: Number,
      default: 0
    }
  },
  agentActivity: [{
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    chatsHandled: {
      type: Number,
      default: 0
    },
    messagesSent: {
      type: Number,
      default: 0
    },
    avgResponseTime: {
      type: Number,
      default: 0
    },
    onlineTime: {
      type: Number,
      default: 0
    }
  }],
  visitorActivity: [{
    visitorId: String,
    firstVisit: Date,
    lastVisit: Date,
    totalVisits: {
      type: Number,
      default: 1
    },
    totalChats: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    }
  }],
  hourlyData: [{
    hour: {
      type: Number,
      min: 0,
      max: 23
    },
    chats: {
      type: Number,
      default: 0
    },
    messages: {
      type: Number,
      default: 0
    },
    visitors: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Compound index for efficient queries
analyticsSchema.index({ siteId: 1, date: 1 });
analyticsSchema.index({ date: 1 });

// Method to update metrics
analyticsSchema.methods.updateMetrics = function(newMetrics) {
  Object.assign(this.metrics, newMetrics);
  return this.save();
};

// Method to add agent activity
analyticsSchema.methods.addAgentActivity = function(agentId, activity) {
  const existingAgent = this.agentActivity.find(a => a.agentId.equals(agentId));
  if (existingAgent) {
    Object.assign(existingAgent, activity);
  } else {
    this.agentActivity.push({
      agentId,
      ...activity
    });
  }
  return this.save();
};

// Method to add visitor activity
analyticsSchema.methods.addVisitorActivity = function(visitorId, activity) {
  const existingVisitor = this.visitorActivity.find(v => v.visitorId === visitorId);
  if (existingVisitor) {
    Object.assign(existingVisitor, activity);
  } else {
    this.visitorActivity.push({
      visitorId,
      ...activity
    });
  }
  return this.save();
};

// Method to update hourly data
analyticsSchema.methods.updateHourlyData = function(hour, data) {
  const hourData = this.hourlyData.find(h => h.hour === hour);
  if (hourData) {
    Object.assign(hourData, data);
  } else {
    this.hourlyData.push({
      hour,
      ...data
    });
  }
  return this.save();
};

// Method to get public analytics
analyticsSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    siteId: this.siteId,
    date: this.date,
    metrics: this.metrics,
    agentActivity: this.agentActivity,
    visitorActivity: this.visitorActivity,
    hourlyData: this.hourlyData,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Analytics', analyticsSchema); 