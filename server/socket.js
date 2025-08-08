const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Chat = require('./models/Chat');
const Site = require('./models/Site');

module.exports = (io) => {
  // Store socket connections
  const connectedUsers = new Map();
  const userSockets = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zymo-secret-key');
      const user = await User.findById(decoded.userId).select('-passwordHash');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`User connected: ${user.name} (${user._id})`);

    // Store user connection
    connectedUsers.set(user._id.toString(), {
      socketId: socket.id,
      user: user.toPublicJSON(),
      connectedAt: new Date()
    });

    // Store socket for user
    if (!userSockets.has(user._id.toString())) {
      userSockets.set(user._id.toString(), new Set());
    }
    userSockets.get(user._id.toString()).add(socket.id);

    // Update user online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Join user to their site rooms
    if (user.teamSites && user.teamSites.length > 0) {
      for (const siteId of user.teamSites) {
        socket.join(siteId.toString());
        console.log(`User ${user.name} joined site room: ${siteId}`);
      }
    }

    // Join admin to all site rooms
    if (user.role === 'zymo_admin') {
      const allSites = await Site.find().select('_id');
      for (const site of allSites) {
        socket.join(site._id.toString());
      }
      console.log(`Admin ${user.name} joined all site rooms`);
    }

    // Handle chat room joins
    socket.on('join_chat', async (data) => {
      try {
        const { chatId } = data;
        
        // Verify user has access to this chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        const site = await Site.findById(chat.siteId);
        if (!site.hasUserAccess(user._id) && user.role !== 'zymo_admin') {
          socket.emit('error', { message: 'Access denied to this chat' });
          return;
        }

        socket.join(chatId);
        console.log(`User ${user.name} joined chat: ${chatId}`);

        // Mark messages as read
        await chat.markAsRead(user._id);

        socket.emit('chat_joined', { chatId });
      } catch (error) {
        console.error('Join chat error:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle chat room leaves
    socket.on('leave_chat', (data) => {
      const { chatId } = data;
      socket.leave(chatId);
      console.log(`User ${user.name} left chat: ${chatId}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { chatId } = data;
      socket.to(chatId).emit('user_typing', {
        chatId,
        userId: user._id,
        userName: user.name
      });
    });

    socket.on('typing_stop', (data) => {
      const { chatId } = data;
      socket.to(chatId).emit('user_stopped_typing', {
        chatId,
        userId: user._id
      });
    });

    // Handle agent status updates
    socket.on('status_update', async (data) => {
      try {
        const { status } = data;
        
        // Update user status
        user.isOnline = status === 'online';
        user.lastSeen = new Date();
        await user.save();

        // Notify team members
        if (user.teamSites && user.teamSites.length > 0) {
          for (const siteId of user.teamSites) {
            socket.to(siteId.toString()).emit('agent_status_changed', {
              userId: user._id,
              status: user.isOnline ? 'online' : 'offline',
              userName: user.name
            });
          }
        }

        console.log(`User ${user.name} status updated: ${status}`);
      } catch (error) {
        console.error('Status update error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${user.name} (${user._id})`);

      // Remove socket from user's socket set
      const userSocketSet = userSockets.get(user._id.toString());
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        
        // If no more sockets for this user, mark as offline
        if (userSocketSet.size === 0) {
          userSockets.delete(user._id.toString());
          connectedUsers.delete(user._id.toString());

          // Update user offline status
          user.isOnline = false;
          user.lastSeen = new Date();
          await user.save();

          // Notify team members
          if (user.teamSites && user.teamSites.length > 0) {
            for (const siteId of user.teamSites) {
              socket.to(siteId.toString()).emit('agent_status_changed', {
                userId: user._id,
                status: 'offline',
                userName: user.name
              });
            }
          }
        }
      }
    });
  });

  // Make io available to routes
  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      // Cleanup on disconnect
    });
  });

  // Helper functions for routes to use
  const socketHelpers = {
    // Emit to specific chat room
    emitToChat: (chatId, event, data) => {
      io.to(chatId).emit(event, data);
    },

    // Emit to specific site room
    emitToSite: (siteId, event, data) => {
      io.to(siteId.toString()).emit(event, data);
    },

    // Emit to specific user
    emitToUser: (userId, event, data) => {
      const userConnection = connectedUsers.get(userId.toString());
      if (userConnection) {
        io.to(userConnection.socketId).emit(event, data);
      }
    },

    // Get online users for a site
    getOnlineUsersForSite: async (siteId) => {
      const site = await Site.findById(siteId);
      if (!site) return [];

      const teamUserIds = [site.ownerId, ...site.team.map(member => member.userId)];
      const onlineUsers = [];

      for (const userId of teamUserIds) {
        const userConnection = connectedUsers.get(userId.toString());
        if (userConnection) {
          onlineUsers.push(userConnection.user);
        }
      }

      return onlineUsers;
    },

    // Get all connected users
    getConnectedUsers: () => {
      return Array.from(connectedUsers.values());
    }
  };

  // Attach helpers to io object
  io.helpers = socketHelpers;

  return io;
}; 