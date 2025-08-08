const express = require('express');
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const Site = require('../models/Site');
const User = require('../models/User');
const { requireSiteAccess } = require('../middleware/auth');

const router = express.Router();

// Get all chats for current user (across all sites)
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    let chats;

    if (req.user.role === 'zymo_admin') {
      // Admin can see all chats
      chats = await Chat.find()
        .sort({ 'metadata.lastActivity': -1 })
        .populate('claimedBy', 'name email avatar')
        .populate('siteId', 'name domain');
    } else {
      // Regular users see chats from their sites
      const userSites = await Site.find({
        $or: [
          { ownerId: userId },
          { 'team.userId': userId }
        ]
      });
      
      const siteIds = userSites.map(site => site._id);
      
      chats = await Chat.find({ siteId: { $in: siteIds } })
        .sort({ 'metadata.lastActivity': -1 })
        .populate('claimedBy', 'name email avatar')
        .populate('siteId', 'name domain');
    }

    res.json({
      success: true,
      data: {
        chats: chats.map(chat => chat.getSummary())
      }
    });
  } catch (error) {
    console.error('Get all chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chats'
    });
  }
});

// Get all chats for a site
router.get('/site/:siteId', requireSiteAccess, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { status, page = 1, limit = 20, search } = req.query;
    
    const query = { siteId };
    
    if (status && status !== 'all') {
      query.status = status;
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
      .sort({ 'metadata.lastActivity': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('claimedBy', 'name email avatar');

    const total = await Chat.countDocuments(query);

    res.json({
      success: true,
      data: {
        chats: chats.map(chat => chat.getSummary()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chats'
    });
  }
});

// Get messages for a specific chat
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate('claimedBy', 'name email avatar isOnline')
      .populate('siteId', 'name domain');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user has access to this chat
    const site = await Site.findById(chat.siteId);
    if (!site.hasUserAccess(userId) && req.user.role !== 'zymo_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    res.json({
      success: true,
      data: {
        messages: chat.messages
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages'
    });
  }
});

// Send message to chat
router.post('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = 'text' } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user has access to this chat
    const site = await Site.findById(chat.siteId);
    if (!site.hasUserAccess(userId) && req.user.role !== 'zymo_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    // Add message
    const message = {
      from: 'agent',
      senderId: userId,
      text: content,
      timestamp: new Date()
    };

    await chat.addMessage(message);

    // Emit socket event
    const io = req.app.get('io');
    io.to(chatId).emit('new_message', {
      chatId,
      message
    });

    res.json({
      success: true,
      data: {
        message
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Get specific chat
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate('claimedBy', 'name email avatar isOnline')
      .populate('siteId', 'name domain');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user has access to this chat
    const site = await Site.findById(chat.siteId);
    if (!site.hasUserAccess(userId) && req.user.role !== 'zymo_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    // Mark messages as read if agent is viewing
    if (req.user.role !== 'zymo_admin') {
      await chat.markAsRead(userId);
    }

    res.json({
      success: true,
      data: {
        chat: chat.toPublicJSON(),
        site: site.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat'
    });
  }
});

// Send message to chat
router.post('/:chatId/message', [
  body('text').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters')
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

    const { chatId } = req.params;
    const { text, attachments } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user has access to this chat
    const site = await Site.findById(chat.siteId);
    if (!site.hasUserAccess(userId) && req.user.role !== 'zymo_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    // Add message
    const messageData = {
      from: 'agent',
      senderId: userId,
      text,
      timestamp: new Date(),
      attachments: attachments || []
    };

    await chat.addMessage(messageData);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('new_message', {
        chatId,
        message: messageData
      });
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: messageData
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Claim chat
router.post('/:chatId/claim', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user has access to this chat
    const site = await Site.findById(chat.siteId);
    if (!site.hasUserAccess(userId) && req.user.role !== 'zymo_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    // Check if chat is already claimed
    if (chat.status === 'claimed' && chat.claimedBy && !chat.claimedBy.equals(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Chat is already claimed by another agent'
      });
    }

    await chat.claim(userId);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('chat_claimed', {
        chatId,
        claimedBy: userId
      });
    }

    res.json({
      success: true,
      message: 'Chat claimed successfully',
      data: {
        chat: chat.getSummary()
      }
    });
  } catch (error) {
    console.error('Claim chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim chat'
    });
  }
});

// Close chat
router.post('/:chatId/close', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user has access to this chat
    const site = await Site.findById(chat.siteId);
    if (!site.hasUserAccess(userId) && req.user.role !== 'zymo_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    await chat.close();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('chat_closed', {
        chatId
      });
    }

    res.json({
      success: true,
      message: 'Chat closed successfully',
      data: {
        chat: chat.getSummary()
      }
    });
  } catch (error) {
    console.error('Close chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close chat'
    });
  }
});

// Resolve chat
router.post('/:chatId/resolve', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user has access to this chat
    const site = await Site.findById(chat.siteId);
    if (!site.hasUserAccess(userId) && req.user.role !== 'zymo_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    await chat.resolve();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('chat_resolved', {
        chatId
      });
    }

    res.json({
      success: true,
      message: 'Chat resolved successfully',
      data: {
        chat: chat.getSummary()
      }
    });
  } catch (error) {
    console.error('Resolve chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve chat'
    });
  }
});

// Update chat priority
router.put('/:chatId/priority', [
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level')
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

    const { chatId } = req.params;
    const { priority } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user has access to this chat
    const site = await Site.findById(chat.siteId);
    if (!site.hasUserAccess(userId) && req.user.role !== 'zymo_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    chat.priority = priority;
    await chat.save();

    res.json({
      success: true,
      message: 'Chat priority updated successfully',
      data: {
        chat: chat.getSummary()
      }
    });
  } catch (error) {
    console.error('Update chat priority error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chat priority'
    });
  }
});

// Add note to chat
router.post('/:chatId/note', [
  body('note').trim().isLength({ min: 1, max: 1000 }).withMessage('Note must be between 1 and 1000 characters')
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

    const { chatId } = req.params;
    const { note } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user has access to this chat
    const site = await Site.findById(chat.siteId);
    if (!site.hasUserAccess(userId) && req.user.role !== 'zymo_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    chat.notes = note;
    await chat.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      data: {
        chat: chat.getSummary()
      }
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note'
    });
  }
});

// Get chat statistics
router.get('/site/:siteId/stats', requireSiteAccess, async (req, res) => {
  try {
    const { siteId } = req.params;
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

    const query = { siteId, ...dateFilter };

    const [
      totalChats,
      openChats,
      claimedChats,
      closedChats,
      avgResponseTime
    ] = await Promise.all([
      Chat.countDocuments(query),
      Chat.countDocuments({ ...query, status: 'open' }),
      Chat.countDocuments({ ...query, status: 'claimed' }),
      Chat.countDocuments({ ...query, status: { $in: ['closed', 'resolved'] } }),
      Chat.aggregate([
        { $match: query },
        { $group: { _id: null, avg: { $avg: '$metadata.firstResponseTime' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalChats,
        openChats,
        claimedChats,
        closedChats,
        avgResponseTime: avgResponseTime[0]?.avg || 0,
        period
      }
    });
  } catch (error) {
    console.error('Get chat stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat statistics'
    });
  }
});

module.exports = router; 