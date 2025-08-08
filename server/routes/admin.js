const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Site = require('../models/Site');
const Chat = require('../models/Chat');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all sites (admin view)
router.get('/sites', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query['settings.isActive'] = status === 'active';
    }

    const skip = (page - 1) * limit;
    
    const sites = await Site.find(query)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Site.countDocuments(query);

    res.json({
      success: true,
      data: {
        sites: sites.map(site => ({
          ...site.toPublicJSON(),
          owner: site.ownerId,
          teamCount: site.team.length,
          totalChats: site.stats.totalChats
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admin sites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sites'
    });
  }
});

// Get all chats across all sites (admin view)
router.get('/chats', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, siteId, search } = req.query;
    
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (siteId) {
      query.siteId = siteId;
    }
    
    if (search) {
      query.$or = [
        { 'visitorInfo.name': { $regex: search, $options: 'i' } },
        { 'visitorInfo.email': { $regex: search, $options: 'i' } },
        { 'messages.text': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const chats = await Chat.find(query)
      .populate('siteId', 'name domain')
      .populate('claimedBy', 'name email')
      .sort({ 'metadata.lastActivity': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Chat.countDocuments(query);

    res.json({
      success: true,
      data: {
        chats: chats.map(chat => ({
          ...chat.getSummary(),
          site: chat.siteId
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admin chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chats'
    });
  }
});

// Get all users (admin view)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    
    const query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users: users.map(user => user.toPublicJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
});

// Get platform statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '24h':
        dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
        break;
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case 'all':
        dateFilter = {};
        break;
    }

    const [
      totalUsers,
      totalSites,
      totalChats,
      activeChats,
      newUsers,
      newSites,
      newChats,
      avgResponseTime
    ] = await Promise.all([
      User.countDocuments(),
      Site.countDocuments(),
      Chat.countDocuments(),
      Chat.countDocuments({ status: { $in: ['open', 'claimed'] } }),
      User.countDocuments(dateFilter),
      Site.countDocuments(dateFilter),
      Chat.countDocuments(dateFilter),
      Chat.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, avg: { $avg: '$metadata.firstResponseTime' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalSites,
        totalChats,
        activeChats,
        newUsers,
        newSites,
        newChats,
        avgResponseTime: avgResponseTime[0]?.avg || 0,
        period
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform statistics'
    });
  }
});

// Update user role
router.put('/users/:userId/role', requireAdmin, [
  body('role').isIn(['owner', 'agent', 'zymo_admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

// Disable/enable site
router.put('/sites/:siteId/status', requireAdmin, [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { siteId } = req.params;
    const { isActive } = req.body;

    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    site.settings.isActive = isActive;
    await site.save();

    res.json({
      success: true,
      message: `Site ${isActive ? 'enabled' : 'disabled'} successfully`,
      data: {
        site: site.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Update site status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update site status'
    });
  }
});

// Delete user (admin only)
router.delete('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow admin to delete themselves
    if (user._id.equals(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Remove user from all team sites
    const sites = await Site.find({ 'team.userId': userId });
    for (const site of sites) {
      await site.removeTeamMember(userId);
    }

    // Remove user from owned sites
    const ownedSites = await Site.find({ ownerId: userId });
    for (const site of ownedSites) {
      await site.remove();
    }

    await user.remove();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Get system health
router.get('/health', requireAdmin, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      success: true,
      data: {
        database: dbStatus,
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
        },
        uptime: Math.round(uptime / 60) + ' minutes',
        nodeVersion: process.version,
        platform: process.platform
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed'
    });
  }
});

module.exports = router; 