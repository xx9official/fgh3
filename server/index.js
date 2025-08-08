const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const siteRoutes = require('./routes/sites');
const chatRoutes = require('./routes/chats');
const widgetRoutes = require('./routes/widget');
const adminRoutes = require('./routes/admin');
const docsRoutes = require('./routes/docs');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const teamRoutes = require('./routes/team');

const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://zymo.chat', 'https://www.zymo.chat', '*'] 
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http://localhost:5000"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://zymo.chat', 'https://www.zymo.chat', '*'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
// Enhanced JSON parsing with better error handling
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('JSON Parse Error:', {
        url: req.url,
        method: req.method,
        body: buf.toString(),
        error: e.message,
        contentType: req.headers['content-type']
      });
      throw new Error('Invalid JSON');
    }
  }
}));

// Handle preflight requests
app.options('*', cors());

// Request logging middleware (moved after JSON parsing)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request Headers:', req.headers);
    if (req.headers['content-type']?.includes('application/json')) {
      console.log('JSON Request Body Type:', typeof req.body);
      console.log('JSON Request Body:', req.body);
    }
  }
  next();
});

// Custom error handler for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Syntax Error:', {
      url: req.url,
      method: req.method,
      body: err.body,
      message: err.message
    });
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format in request body',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next(err);
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/widget', express.static(path.join(__dirname, '../client/build')));
app.use('/widget.js', express.static(path.join(__dirname, '../public/widget.js')));


app.use('/public', express.static(path.join(__dirname, '../public')));

// Make io available to routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', authenticateToken, siteRoutes);
app.use('/api/chats', authenticateToken, chatRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/team', authenticateToken, teamRoutes);

// Serve React app
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch-all handler for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Error handling middleware
app.use(errorHandler);

// Socket.IO connection handling
require('./socket')(io);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zymo', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 ZYMO server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Widget URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}/widget`);
console.log(`📚 Docs URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}/docs`);
});

module.exports = { app, server, io }; 