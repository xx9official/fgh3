const express = require('express');
const Settings = require('../models/Settings');
const User = require('../models/User');

const router = express.Router();

// Get user settings
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    
    let settings = await Settings.findOne({ userId });
    
    if (!settings) {
      // Create default settings if none exist
      settings = new Settings({
        userId,
        account: {
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar
        }
      });
      await settings.save();
    }

    res.json({
      success: true,
      data: {
        settings: settings.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings'
    });
  }
});

// Update settings
router.patch('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const { section, data } = req.body;

    let settings = await Settings.findOne({ userId });
    
    if (!settings) {
      settings = new Settings({ userId });
    }

    // Update specific section
    if (section && data) {
      if (settings[section]) {
        Object.assign(settings[section], data);
      } else {
        settings[section] = data;
      }
    }

    await settings.save();

    // Update user profile if account settings changed
    if (section === 'account' && data) {
      const updateData = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.avatar) updateData.avatar = data.avatar;

      if (Object.keys(updateData).length > 0) {
        await User.findByIdAndUpdate(userId, updateData);
      }
    }

    res.json({
      success: true,
      data: {
        settings: settings.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Reset settings to default
router.post('/reset', async (req, res) => {
  try {
    const userId = req.user._id;
    
    await Settings.findOneAndDelete({ userId });
    
    const settings = new Settings({
      userId,
      account: {
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar
      }
    });
    await settings.save();

    res.json({
      success: true,
      data: {
        settings: settings.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings'
    });
  }
});

module.exports = router; 