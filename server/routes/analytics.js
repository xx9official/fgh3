const express = require('express');
const Analytics = require('../models/Analytics');
const Site = require('../models/Site');
const Chat = require('../models/Chat');

const router = express.Router();

// Get analytics for a site
router.get('/site/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { startDate, endDate, period = 'daily' } = req.query;
    const userId = req.user._id;

    // Check if user has access to this site
    const site = await Site.findById(siteId);
    if (!site || !site.hasUserAccess(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this site'
      });
    }

    const query = { siteId };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await Analytics.find(query).sort({ date: 1 });

    res.json({
      success: true,
      data: {
        analytics: analytics.map(a => a.toPublicJSON()),
        period
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics'
    });
  }
});

// Update analytics for a site
router.post('/site/:siteId/update', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { date, metrics, agentActivity, visitorActivity, hourlyData } = req.body;
    const userId = req.user._id;

    // Check if user has access to this site
    const site = await Site.findById(siteId);
    if (!site || !site.hasUserAccess(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this site'
      });
    }

    const analyticsDate = date ? new Date(date) : new Date();
    analyticsDate.setHours(0, 0, 0, 0); // Start of day

    let analytics = await Analytics.findOne({ siteId, date: analyticsDate });
    
    if (!analytics) {
      analytics = new Analytics({
        siteId,
        date: analyticsDate
      });
    }

    // Update metrics
    if (metrics) {
      analytics.updateMetrics(metrics);
    }

    // Update agent activity
    if (agentActivity) {
      for (const activity of agentActivity) {
        await analytics.addAgentActivity(activity.agentId, activity);
      }
    }

    // Update visitor activity
    if (visitorActivity) {
      for (const activity of visitorActivity) {
        await analytics.addVisitorActivity(activity.visitorId, activity);
      }
    }

    // Update hourly data
    if (hourlyData) {
      for (const hourData of hourlyData) {
        await analytics.updateHourlyData(hourData.hour, hourData);
      }
    }

    await analytics.save();

    res.json({
      success: true,
      data: {
        analytics: analytics.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Update analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update analytics'
    });
  }
});

// Get dashboard analytics summary
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '7d' } = req.query;

    // Get user's sites
    const sites = await Site.find({
      $or: [
        { ownerId: userId },
        { 'team.userId': userId }
      ]
    });

    const siteIds = sites.map(site => site._id);
    const endDate = new Date();
    const startDate = new Date();

    // Calculate start date based on period
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Get analytics for all user's sites
    const analytics = await Analytics.find({
      siteId: { $in: siteIds },
      date: { $gte: startDate, $lte: endDate }
    });

    // Aggregate data
    const summary = {
      totalChats: 0,
      activeChats: 0,
      totalMessages: 0,
      avgResponseTime: 0,
      satisfactionRate: 0,
      uniqueVisitors: 0
    };

    let totalSites = 0;
    let totalResponseTime = 0;
    let totalSatisfaction = 0;

    analytics.forEach(analytic => {
      summary.totalChats += analytic.metrics.totalChats || 0;
      summary.activeChats += analytic.metrics.activeChats || 0;
      summary.totalMessages += analytic.metrics.totalMessages || 0;
      summary.uniqueVisitors += analytic.metrics.uniqueVisitors || 0;
      
      if (analytic.metrics.avgResponseTime) {
        totalResponseTime += analytic.metrics.avgResponseTime;
        totalSites++;
      }
      
      if (analytic.metrics.satisfactionRate) {
        totalSatisfaction += analytic.metrics.satisfactionRate;
      }
    });

    if (totalSites > 0) {
      summary.avgResponseTime = Math.round(totalResponseTime / totalSites);
    }
    
    if (analytics.length > 0) {
      summary.satisfactionRate = Math.round(totalSatisfaction / analytics.length);
    }

    res.json({
      success: true,
      data: {
        summary,
        period,
        sitesCount: sites.length
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard analytics'
    });
  }
});

// Generate analytics for a site (cron job endpoint)
router.post('/site/:siteId/generate', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { date } = req.body;

    const analyticsDate = date ? new Date(date) : new Date();
    analyticsDate.setHours(0, 0, 0, 0);

    // Get chats for the day
    const startOfDay = new Date(analyticsDate);
    const endOfDay = new Date(analyticsDate);
    endOfDay.setHours(23, 59, 59, 999);

    const chats = await Chat.find({
      siteId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate('claimedBy', 'name');

    // Calculate metrics
    const metrics = {
      totalChats: chats.length,
      activeChats: chats.filter(chat => chat.status === 'open' || chat.status === 'claimed').length,
      closedChats: chats.filter(chat => chat.status === 'closed' || chat.status === 'resolved').length,
      totalMessages: chats.reduce((sum, chat) => sum + chat.messages.length, 0),
      visitorMessages: chats.reduce((sum, chat) => 
        sum + chat.messages.filter(msg => msg.from === 'visitor').length, 0
      ),
      agentMessages: chats.reduce((sum, chat) => 
        sum + chat.messages.filter(msg => msg.from === 'agent').length, 0
      ),
      uniqueVisitors: new Set(chats.map(chat => chat.visitorId)).size
    };

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;

    chats.forEach(chat => {
      if (chat.metadata.firstResponseTime) {
        totalResponseTime += chat.metadata.firstResponseTime;
        responseCount++;
      }
    });

    if (responseCount > 0) {
      metrics.avgResponseTime = Math.round(totalResponseTime / responseCount);
    }

    // Calculate satisfaction rate
    const ratedChats = chats.filter(chat => chat.satisfaction.rating);
    if (ratedChats.length > 0) {
      const totalRating = ratedChats.reduce((sum, chat) => sum + chat.satisfaction.rating, 0);
      metrics.satisfactionRate = Math.round((totalRating / ratedChats.length) * 20); // Convert to percentage
    }

    // Create or update analytics
    let analytics = await Analytics.findOne({ siteId, date: analyticsDate });
    
    if (!analytics) {
      analytics = new Analytics({
        siteId,
        date: analyticsDate
      });
    }

    analytics.updateMetrics(metrics);
    await analytics.save();

    res.json({
      success: true,
      data: {
        analytics: analytics.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Generate analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics'
    });
  }
});

module.exports = router; 