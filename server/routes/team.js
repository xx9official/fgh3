const express = require('express');
const User = require('../models/User');
const Site = require('../models/Site');
const Notification = require('../models/Notification');

const router = express.Router();

// Get team members for current user's sites
router.get('/members', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all sites where user is owner or team member
    const sites = await Site.find({
      $or: [
        { ownerId: userId },
        { 'team.userId': userId }
      ]
    }).populate('ownerId', 'name email avatar');

    // Collect all unique team members across all sites
    const teamMembers = new Map();
    
    sites.forEach(site => {
      // Add site owner
      if (site.ownerId) {
        teamMembers.set(site.ownerId._id.toString(), {
          _id: site.ownerId._id,
          name: site.ownerId.name,
          email: site.ownerId.email,
          avatar: site.ownerId.avatar,
          role: 'owner',
          sites: [site._id],
          joinedAt: site.createdAt
        });
      }
      
      // Add team members
      site.team.forEach(member => {
        const memberId = member.userId.toString();
        if (teamMembers.has(memberId)) {
          // Update existing member with additional site
          const existing = teamMembers.get(memberId);
          existing.sites.push(site._id);
          if (member.role === 'admin' && existing.role !== 'owner') {
            existing.role = 'admin';
          }
        } else {
          // Add new member
          teamMembers.set(memberId, {
            _id: member.userId,
            name: member.name || 'Unknown User',
            email: member.email || 'No email',
            avatar: member.avatar,
            role: member.role,
            sites: [site._id],
            joinedAt: member.acceptedAt || member.invitedAt
          });
        }
      });
    });

    // Convert to array and populate user details for team members
    const membersArray = Array.from(teamMembers.values());
    
    // Get full user details for team members
    const memberIds = membersArray.map(m => m._id);
    const users = await User.find({ _id: { $in: memberIds } });
    
    const membersWithDetails = membersArray.map(member => {
      const user = users.find(u => u._id.toString() === member._id.toString());
      return {
        ...member,
        name: user ? user.name : member.name,
        email: user ? user.email : member.email,
        avatar: user ? user.avatar : member.avatar,
        isOnline: user ? user.isOnline : false,
        lastSeen: user ? user.lastSeen : null
      };
    });

    res.json({
      success: true,
      data: {
        members: membersWithDetails
      }
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get team members'
    });
  }
});

// Get pending invites
router.get('/invites', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all sites where user is owner
    const sites = await Site.find({ ownerId: userId });
    
    // Collect all pending invites
    const pendingInvites = [];
    
    sites.forEach(site => {
      site.team.forEach(member => {
        if (!member.acceptedAt) {
          pendingInvites.push({
            _id: member._id,
            siteId: site._id,
            siteName: site.name,
            email: member.email,
            role: member.role,
            invitedAt: member.invitedAt,
            invitedBy: member.invitedBy
          });
        }
      });
    });

    res.json({
      success: true,
      data: {
        invites: pendingInvites
      }
    });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invites'
    });
  }
});

// Send team invite
router.post('/invites', async (req, res) => {
  try {
    const userId = req.user._id;
    const { email, role, siteId } = req.body;

    // Validate site ownership
    const site = await Site.findOne({ _id: siteId, ownerId: userId });
    if (!site) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this site'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      // User exists, add them to team directly
      await site.addTeamMember(existingUser._id, role);
      
      // Create notification for the user
      const notification = new Notification({
        userId: existingUser._id,
        type: 'team_member',
        title: 'Team Invitation',
        message: `You've been added to the team for ${site.name}`,
        data: {
          siteId: site._id,
          role: role
        }
      });
      await notification.save();

      res.json({
        success: true,
        message: 'User added to team successfully',
        data: {
          member: {
            _id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            avatar: existingUser.avatar,
            role: role
          }
        }
      });
    } else {
      // User doesn't exist, create pending invite
      const inviteData = {
        email: email,
        role: role,
        invitedAt: new Date(),
        invitedBy: userId
      };
      
      site.team.push(inviteData);
      await site.save();

      res.json({
        success: true,
        message: 'Invitation sent successfully',
        data: {
          invite: {
            _id: inviteData._id,
            email: email,
            role: role,
            invitedAt: inviteData.invitedAt
          }
        }
      });
    }
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitation'
    });
  }
});

// Update team member role
router.patch('/members/:memberId', async (req, res) => {
  try {
    const userId = req.user._id;
    const { memberId } = req.params;
    const { role, siteId } = req.body;

    // Validate site ownership
    const site = await Site.findOne({ _id: siteId, ownerId: userId });
    if (!site) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this site'
      });
    }

    // Update member role
    await site.updateTeamMemberRole(memberId, role);

    res.json({
      success: true,
      message: 'Member role updated successfully'
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update member role'
    });
  }
});

// Remove team member
router.delete('/members/:memberId', async (req, res) => {
  try {
    const userId = req.user._id;
    const { memberId } = req.params;
    const { siteId } = req.body;

    // Validate site ownership
    const site = await Site.findOne({ _id: siteId, ownerId: userId });
    if (!site) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this site'
      });
    }

    // Remove member from team
    await site.removeTeamMember(memberId);

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member'
    });
  }
});

// Accept team invite
router.post('/invites/:inviteId/accept', async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user._id;

    // Find site with this invite
    const site = await Site.findOne({
      'team._id': inviteId,
      'team.email': req.user.email
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    // Update invite to accepted
    const teamMember = site.team.find(member => member._id.toString() === inviteId);
    if (teamMember) {
      teamMember.acceptedAt = new Date();
      await site.save();
    }

    res.json({
      success: true,
      message: 'Invitation accepted successfully'
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept invitation'
    });
  }
});

// Decline team invite
router.post('/invites/:inviteId/decline', async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user._id;

    // Find site with this invite
    const site = await Site.findOne({
      'team._id': inviteId,
      'team.email': req.user.email
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    // Remove invite
    site.team = site.team.filter(member => member._id.toString() !== inviteId);
    await site.save();

    res.json({
      success: true,
      message: 'Invitation declined successfully'
    });
  } catch (error) {
    console.error('Decline invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline invitation'
    });
  }
});

module.exports = router; 