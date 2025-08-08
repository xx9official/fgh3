const express = require('express');
const { body, validationResult } = require('express-validator');
const Site = require('../models/Site');
const User = require('../models/User');
const { requireSiteAccess, requireSiteOwner } = require('../middleware/auth');

const router = express.Router();

// Get all sites for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    let sites;

    if (req.user.role === 'zymo_admin') {
      // Admin can see all sites
      sites = await Site.find().populate('ownerId', 'name email');
    } else {
      // Regular users see their owned sites and team sites
      sites = await Site.find({
        $or: [
          { ownerId: userId },
          { 'team.userId': userId }
        ]
      }).populate('ownerId', 'name email');
    }

    res.json({
      success: true,
      data: {
        sites: sites.map(site => site.toPublicJSON()),
        total: sites.length
      }
    });
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sites'
    });
  }
});

// Create new site
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Site name must be between 2 and 100 characters'),
  body('domain').matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/).withMessage('Please enter a valid domain (e.g., example.com)').customSanitizer(value => value.toLowerCase().replace(/^https?:\/\//, '')),
  body('customization.color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Please enter a valid hex color'),
  body('customization.position').optional().isIn(['right', 'left']).withMessage('Position must be right or left')
], async (req, res) => {
  try {
    console.log('Creating site with data:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const { name, domain, customization } = req.body;

    // Check if user already has 3 sites (limit for free tier)
    if (req.user.role !== 'zymo_admin') {
      const userSites = await Site.find({ ownerId: userId });
      if (userSites.length >= 3) {
        return res.status(400).json({
          success: false,
          message: 'You can only have up to 3 sites on the free plan'
        });
      }
    }

    // Check if domain is already taken
    const existingSite = await Site.findOne({ domain: domain.toLowerCase() });
    if (existingSite) {
      return res.status(400).json({
        success: false,
        message: 'This domain is already registered'
      });
    }

    // Create new site
    const site = new Site({
      ownerId: userId,
      name,
      domain: domain.toLowerCase(),
      customization: {
        color: customization?.color || '#0088ff',
        position: customization?.position || 'right',
        navbarTitle: customization?.navbarTitle || 'Chat with us',
        welcomeMessage: customization?.welcomeMessage || 'Hello! How can we help you today?',
        offlineMessage: customization?.offlineMessage || 'We are currently offline. Please leave a message and we\'ll get back to you.'
      },
      settings: req.body.settings || {
        autoAssign: true,
        notifications: {
          email: true,
          browser: true
        },
        offlineMode: false
      }
    });

    // Generate widget code before saving
    if (!site.widgetCode) {
      site.widgetCode = `site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    await site.save();

    // Add site to user's teamSites
    const user = await User.findById(userId);
    user.teamSites.push(site._id);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Site created successfully',
      data: {
        site: site.toPublicJSON(),
        embedCode: site.getEmbedCode()
      }
    });
  } catch (error) {
    console.error('Create site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create site'
    });
  }
});

// Get specific site
router.get('/:siteId', requireSiteAccess, async (req, res) => {
  try {
    const site = await Site.findById(req.params.siteId)
      .populate('ownerId', 'name email')
      .populate('team.userId', 'name email avatar isOnline');

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    res.json({
      success: true,
      data: {
        site: site.toPublicJSON(),
        embedCode: site.getEmbedCode(),
        team: site.team
      }
    });
  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get site'
    });
  }
});

// Update site
router.put('/:siteId', requireSiteAccess, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Site name must be between 2 and 100 characters'),
  body('domain').optional().matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/).withMessage('Please enter a valid domain'),
  body('customization.color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Please enter a valid hex color'),
  body('customization.position').optional().isIn(['right', 'left']).withMessage('Position must be right or left')
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

    const { name, domain, customization, settings } = req.body;
    const site = await Site.findById(req.params.siteId);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Check domain uniqueness if changing
    if (domain && domain.toLowerCase() !== site.domain) {
      const existingSite = await Site.findOne({ domain: domain.toLowerCase() });
      if (existingSite) {
        return res.status(400).json({
          success: false,
          message: 'This domain is already registered'
        });
      }
      site.domain = domain.toLowerCase();
    }

    if (name) site.name = name;
    if (customization) {
      site.customization = { ...site.customization, ...customization };
    }
    if (settings) {
      site.settings = { ...site.settings, ...settings };
    }

    await site.save();

    res.json({
      success: true,
      message: 'Site updated successfully',
      data: {
        site: site.toPublicJSON(),
        embedCode: site.getEmbedCode()
      }
    });
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update site'
    });
  }
});

// Delete site
router.delete('/:siteId', requireSiteOwner, async (req, res) => {
  try {
    const site = await Site.findById(req.params.siteId);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Remove site from all team members
    const teamUserIds = site.team.map(member => member.userId);
    await User.updateMany(
      { _id: { $in: teamUserIds } },
      { $pull: { teamSites: site._id } }
    );

    // Remove site from owner
    await User.findByIdAndUpdate(site.ownerId, {
      $pull: { teamSites: site._id }
    });

    await Site.findByIdAndDelete(site._id);

    res.json({
      success: true,
      message: 'Site deleted successfully'
    });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete site'
    });
  }
});

// Invite team member
router.post('/:siteId/invite', requireSiteOwner, [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('role').optional().isIn(['admin', 'agent']).withMessage('Role must be admin or agent')
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

    const { email, role = 'agent' } = req.body;
    const site = await Site.findById(req.params.siteId);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user with invite
      user = new User({
        name: email.split('@')[0], // Use email prefix as name
        email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        role: 'agent',
        invitedBy: req.user._id
      });
      await user.save();
    }

    // Add to site team
    await site.addTeamMember(user._id, role);

    // Add site to user's teamSites
    if (!user.teamSites.includes(site._id)) {
      user.teamSites.push(site._id);
      await user.save();
    }

    // TODO: Send invitation email

    res.json({
      success: true,
      message: 'Team member invited successfully',
      data: {
        user: user.toPublicJSON(),
        role
      }
    });
  } catch (error) {
    console.error('Invite team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invite team member'
    });
  }
});

// Remove team member
router.delete('/:siteId/team/:userId', requireSiteOwner, async (req, res) => {
  try {
    const { siteId, userId } = req.params;
    const site = await Site.findById(siteId);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Remove from site team
    await site.removeTeamMember(userId);

    // Remove site from user's teamSites
    await User.findByIdAndUpdate(userId, {
      $pull: { teamSites: siteId }
    });

    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove team member'
    });
  }
});

// Update team member role
router.put('/:siteId/team/:userId/role', requireSiteOwner, [
  body('role').isIn(['admin', 'agent']).withMessage('Role must be admin or agent')
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

    const { siteId, userId } = req.params;
    const { role } = req.body;
    const site = await Site.findById(siteId);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    await site.updateTeamMemberRole(userId, role);

    res.json({
      success: true,
      message: 'Team member role updated successfully',
      data: { role }
    });
  } catch (error) {
    console.error('Update team member role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team member role'
    });
  }
});

module.exports = router; 