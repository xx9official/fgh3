const express = require('express');
const router = express.Router();

// Get API documentation
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'ZYMO Chat Widget API Documentation',
      version: '1.0.0',
      description: 'Complete documentation for integrating ZYMO chat widget into your website',
      sections: [
        {
          title: 'Quick Start',
          content: 'Get your chat widget up and running in minutes',
          endpoints: []
        },
        {
          title: 'Widget Integration',
          content: 'Learn how to embed the chat widget on your website',
          endpoints: []
        },
        {
          title: 'Customization',
          content: 'Customize the appearance and behavior of your chat widget',
          endpoints: []
        },
        {
          title: 'API Reference',
          content: 'Complete API reference for advanced integrations',
          endpoints: []
        }
      ]
    }
  });
});

// Get widget embed code example
router.get('/embed-code', (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Widget Embed Code',
      description: 'Copy and paste this code into your website to add the ZYMO chat widget',
      examples: [
        {
          name: 'Basic Integration',
          description: 'Simple widget with default settings',
          code: `<script src="https://cdn.zymo.chat/widget.js" data-site-id="YOUR_SITE_ID"></script>`
        },
        {
          name: 'Customized Widget',
          description: 'Widget with custom color and position',
          code: `<script src="https://cdn.zymo.chat/widget.js" data-site-id="YOUR_SITE_ID" data-color="#0088ff" data-position="right"></script>`
        },
        {
          name: 'Advanced Configuration',
          description: 'Widget with all customization options',
          code: `<script src="https://cdn.zymo.chat/widget.js" 
  data-site-id="YOUR_SITE_ID" 
  data-color="#0088ff" 
  data-position="right"
  data-title="Chat with us"
  data-welcome-message="Hello! How can we help you today?">
</script>`
        }
      ],
      parameters: [
        {
          name: 'data-site-id',
          type: 'string',
          required: true,
          description: 'Your unique site identifier from the ZYMO dashboard'
        },
        {
          name: 'data-color',
          type: 'string',
          required: false,
          description: 'Hex color code for the widget theme (default: #0088ff)'
        },
        {
          name: 'data-position',
          type: 'string',
          required: false,
          description: 'Widget position: "left" or "right" (default: "right")'
        },
        {
          name: 'data-title',
          type: 'string',
          required: false,
          description: 'Custom title for the chat widget (default: "Chat with us")'
        },
        {
          name: 'data-welcome-message',
          type: 'string',
          required: false,
          description: 'Custom welcome message shown to visitors'
        }
      ]
    }
  });
});

// Get API endpoints documentation
router.get('/api-endpoints', (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'API Endpoints',
      description: 'Complete list of available API endpoints for advanced integrations',
      endpoints: [
        {
          method: 'GET',
          path: '/api/widget/config/:siteId',
          description: 'Get site configuration for widget',
          parameters: [
            { name: 'siteId', type: 'string', description: 'Your site widget code' }
          ],
          response: {
            success: true,
            data: {
              site: {
                name: 'Site Name',
                domain: 'example.com',
                customization: {
                  color: '#0088ff',
                  position: 'right',
                  navbarTitle: 'Chat with us'
                }
              }
            }
          }
        },
        {
          method: 'POST',
          path: '/api/widget/chat',
          description: 'Create new chat (visitor starts conversation)',
          parameters: [
            { name: 'siteId', type: 'string', required: true, description: 'Your site widget code' },
            { name: 'message', type: 'string', required: true, description: 'Initial message from visitor' },
            { name: 'visitorInfo.name', type: 'string', required: false, description: 'Visitor name' },
            { name: 'visitorInfo.email', type: 'string', required: false, description: 'Visitor email' }
          ],
          response: {
            success: true,
            data: {
              chatId: 'chat_id',
              visitorId: 'visitor_id',
              chat: { /* chat object */ }
            }
          }
        },
        {
          method: 'POST',
          path: '/api/widget/chat/:chatId/message',
          description: 'Send message from visitor',
          parameters: [
            { name: 'chatId', type: 'string', required: true, description: 'Chat ID' },
            { name: 'text', type: 'string', required: true, description: 'Message text' },
            { name: 'visitorId', type: 'string', required: true, description: 'Visitor ID' }
          ],
          response: {
            success: true,
            data: {
              message: { /* message object */ }
            }
          }
        },
        {
          method: 'GET',
          path: '/api/widget/chat/:chatId',
          description: 'Get chat messages',
          parameters: [
            { name: 'chatId', type: 'string', required: true, description: 'Chat ID' },
            { name: 'visitorId', type: 'string', required: true, description: 'Visitor ID' }
          ],
          response: {
            success: true,
            data: {
              chat: { /* chat object */ }
            }
          }
        },
        {
          method: 'GET',
          path: '/api/widget/status/:siteId',
          description: 'Check if agents are online',
          parameters: [
            { name: 'siteId', type: 'string', required: true, description: 'Your site widget code' }
          ],
          response: {
            success: true,
            data: {
              isActive: true,
              onlineAgents: 2,
              agents: [/* agent objects */]
            }
          }
        }
      ]
    }
  });
});

// Get JavaScript API documentation
router.get('/javascript-api', (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'JavaScript API',
      description: 'Advanced JavaScript API for custom widget integrations',
      methods: [
        {
          name: 'ZymoWidget.init()',
          description: 'Initialize the widget with custom configuration',
          parameters: [
            { name: 'config', type: 'object', description: 'Widget configuration object' }
          ],
          example: `ZymoWidget.init({
  siteId: 'your-site-id',
  color: '#0088ff',
  position: 'right',
  onChatStart: function(chatId) {
    console.log('Chat started:', chatId);
  },
  onMessage: function(message) {
    console.log('New message:', message);
  }
});`
        },
        {
          name: 'ZymoWidget.open()',
          description: 'Programmatically open the chat widget',
          parameters: [],
          example: `ZymoWidget.open();`
        },
        {
          name: 'ZymoWidget.close()',
          description: 'Programmatically close the chat widget',
          parameters: [],
          example: `ZymoWidget.close();`
        },
        {
          name: 'ZymoWidget.sendMessage()',
          description: 'Send a message programmatically',
          parameters: [
            { name: 'text', type: 'string', description: 'Message text' }
          ],
          example: `ZymoWidget.sendMessage('Hello from my website!');`
        },
        {
          name: 'ZymoWidget.on()',
          description: 'Listen to widget events',
          parameters: [
            { name: 'event', type: 'string', description: 'Event name' },
            { name: 'callback', type: 'function', description: 'Event callback function' }
          ],
          example: `ZymoWidget.on('chat_started', function(chatId) {
  console.log('Chat started with ID:', chatId);
});

ZymoWidget.on('message_received', function(message) {
  console.log('Received message:', message);
});`
        }
      ],
      events: [
        {
          name: 'chat_started',
          description: 'Fired when a new chat is started',
          data: { chatId: 'string' }
        },
        {
          name: 'message_received',
          description: 'Fired when a new message is received',
          data: { message: 'object' }
        },
        {
          name: 'widget_opened',
          description: 'Fired when the widget is opened',
          data: {}
        },
        {
          name: 'widget_closed',
          description: 'Fired when the widget is closed',
          data: {}
        },
        {
          name: 'agent_online',
          description: 'Fired when an agent comes online',
          data: { agent: 'object' }
        },
        {
          name: 'agent_offline',
          description: 'Fired when an agent goes offline',
          data: { agent: 'object' }
        }
      ]
    }
  });
});

// Get examples and tutorials
router.get('/examples', (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Examples & Tutorials',
      description: 'Real-world examples and step-by-step tutorials',
      tutorials: [
        {
          title: 'Basic Integration',
          description: 'Learn how to add the ZYMO chat widget to your website',
          steps: [
            'Sign up for a ZYMO account',
            'Create your first site in the dashboard',
            'Copy the embed code from your site settings',
            'Paste the code into your website HTML',
            'Test the widget on your website'
          ],
          code: `<script src="https://cdn.zymo.chat/widget.js" data-site-id="YOUR_SITE_ID"></script>`
        },
        {
          title: 'Custom Styling',
          description: 'Customize the widget appearance to match your brand',
          steps: [
            'Choose your brand colors',
            'Update the widget color parameter',
            'Set the widget position (left or right)',
            'Customize the welcome message',
            'Test the appearance on your website'
          ],
          code: `<script src="https://cdn.zymo.chat/widget.js" 
  data-site-id="YOUR_SITE_ID" 
  data-color="#ff6b6b" 
  data-position="left"
  data-welcome-message="Welcome to our store! How can we help you today?">
</script>`
        },
        {
          title: 'Advanced JavaScript Integration',
          description: 'Use the JavaScript API for advanced customizations',
          steps: [
            'Include the widget script',
            'Initialize with custom configuration',
            'Listen to widget events',
            'Implement custom functionality',
            'Test the integration'
          ],
          code: `// Initialize widget with custom config
ZymoWidget.init({
  siteId: 'your-site-id',
  color: '#0088ff',
  position: 'right',
  onChatStart: function(chatId) {
    // Track chat start in analytics
    gtag('event', 'chat_started', { chat_id: chatId });
  },
  onMessage: function(message) {
    // Handle new messages
    console.log('New message:', message);
  }
});

// Listen to widget events
ZymoWidget.on('widget_opened', function() {
  console.log('Widget opened');
});

ZymoWidget.on('agent_online', function(agent) {
  console.log('Agent online:', agent.name);
});`
        }
      ]
    }
  });
});

module.exports = router; 