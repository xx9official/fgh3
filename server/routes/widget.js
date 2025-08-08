const express = require('express');
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const Site = require('../models/Site');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get site configuration for widget
router.get('/config/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    
    const site = await Site.findOne({ widgetCode: siteId });
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    if (!site.settings.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Widget is disabled for this site'
      });
    }

    res.json({
      success: true,
      data: {
        site: {
          name: site.name,
          domain: site.domain,
          customization: site.customization,
          settings: {
            requireEmail: site.settings.requireEmail,
            workingHours: site.settings.workingHours
          }
        }
      }
    });
  } catch (error) {
    console.error('Get widget config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get widget configuration'
    });
  }
});

// Create new chat (visitor starts conversation)
router.post('/chat', [
  body('siteId').notEmpty().withMessage('Site ID is required'),
  body('visitorInfo.name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('visitorInfo.email').optional().isEmail().withMessage('Please enter a valid email'),
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters')
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

    const { siteId, visitorInfo, message } = req.body;

    // Find site by widget code
    const site = await Site.findOne({ widgetCode: siteId });
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    if (!site.settings.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Widget is disabled for this site'
      });
    }

    // Generate visitor ID
    const visitorId = uuidv4();

    // Create new chat
    const chat = new Chat({
      siteId: site._id,
      visitorId,
      visitorInfo: {
        name: visitorInfo?.name || 'Anonymous',
        email: visitorInfo?.email || null,
        phone: visitorInfo?.phone || null,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        referrer: req.headers.referer || null,
        currentPage: req.headers.referer || null
      },
      messages: [{
        from: 'visitor',
        text: message,
        timestamp: new Date()
      }],
      status: 'open'
    });

    await chat.save();

    // Update site stats
    site.stats.totalChats += 1;
    site.stats.totalMessages += 1;
    await site.save();

    // Emit socket event for real-time notifications
    const io = req.app.get('io');
    if (io) {
      io.to(site._id.toString()).emit('new_chat', {
        siteId: site._id,
        chat: chat.getSummary()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: {
        chatId: chat._id,
        visitorId,
        chat: chat.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat'
    });
  }
});

// Send message from visitor
router.post('/chat/:chatId/message', [
  body('text').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters'),
  body('visitorId').notEmpty().withMessage('Visitor ID is required')
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
    const { text, visitorId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify visitor ID
    if (chat.visitorId !== visitorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if chat is closed
    if (chat.status === 'closed' || chat.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'This chat is closed'
      });
    }

    // Add message
    const messageData = {
      from: 'visitor',
      text,
      timestamp: new Date()
    };

    await chat.addMessage(messageData);

    // Update site stats
    const site = await Site.findById(chat.siteId);
    if (site) {
      site.stats.totalMessages += 1;
      await site.save();
    }

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
    console.error('Send visitor message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Get chat messages (for widget)
router.get('/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { visitorId } = req.query;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify visitor ID
    if (chat.visitorId !== visitorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        chat: chat.toPublicJSON()
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

// Close chat from widget
router.post('/chat/:chatId/close', [
  body('visitorId').notEmpty().withMessage('Visitor ID is required')
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
    const { visitorId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify visitor ID
    if (chat.visitorId !== visitorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
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
      message: 'Chat closed successfully'
    });
  } catch (error) {
    console.error('Close chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close chat'
    });
  }
});

// Submit satisfaction rating
router.post('/chat/:chatId/satisfaction', [
  body('visitorId').notEmpty().withMessage('Visitor ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().trim().isLength({ max: 500 }).withMessage('Feedback must be less than 500 characters')
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
    const { visitorId, rating, feedback } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify visitor ID
    if (chat.visitorId !== visitorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update satisfaction rating
    chat.satisfaction = {
      rating,
      feedback,
      submittedAt: new Date()
    };
    await chat.save();

    res.json({
      success: true,
      message: 'Satisfaction rating submitted successfully'
    });
  } catch (error) {
    console.error('Submit satisfaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit satisfaction rating'
    });
  }
});

// Check if agents are online
router.get('/status/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    
    const site = await Site.findOne({ widgetCode: siteId });
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Get online team members
    const onlineAgents = await User.find({
      _id: { $in: site.team.map(member => member.userId) },
      isOnline: true
    }).select('name avatar');

    res.json({
      success: true,
      data: {
        isActive: site.settings.isActive,
        onlineAgents: onlineAgents.length,
        agents: onlineAgents
      }
    });
  } catch (error) {
    console.error('Get widget status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get widget status'
    });
  }
});

module.exports = router; 