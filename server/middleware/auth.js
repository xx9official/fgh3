const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Authenticating request to:', req.url);
    const authHeader = req.headers['authorization'];
    console.log('📋 Auth header:', authHeader ? 'present' : 'missing');
    
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    console.log('🎫 Token:', token ? 'present' : 'missing');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    console.log('🔍 Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zymo-secret-key');
    console.log('✅ Token verified, user ID:', decoded.userId);
    
    const user = await User.findById(decoded.userId).select('-passwordHash');
    console.log('👤 User found:', user ? user.name : 'null');

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    req.user = user;
    console.log('✅ Authentication successful for:', user.name);
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.name, error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

const requireAdmin = requireRole(['zymo_admin']);
const requireOwner = requireRole(['owner', 'zymo_admin']);

const requireSiteAccess = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const userId = req.user._id;

    // Check if user is admin (has access to all sites)
    if (req.user.role === 'zymo_admin') {
      return next();
    }

    // Check if user owns the site or is a team member
    const Site = require('../models/Site');
    const site = await Site.findById(siteId);

    if (!site) {
      return res.status(404).json({ 
        success: false, 
        message: 'Site not found' 
      });
    }

    if (!site.hasUserAccess(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this site' 
      });
    }

    req.site = site;
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking site access' 
    });
  }
};

const requireSiteOwner = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const userId = req.user._id;

    // Check if user is admin (has access to all sites)
    if (req.user.role === 'zymo_admin') {
      return next();
    }

    const Site = require('../models/Site');
    const site = await Site.findById(siteId);

    if (!site) {
      return res.status(404).json({ 
        success: false, 
        message: 'Site not found' 
      });
    }

    if (!site.ownerId.equals(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only site owner can perform this action' 
      });
    }

    req.site = site;
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking site ownership' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireOwner,
  requireSiteAccess,
  requireSiteOwner
}; 