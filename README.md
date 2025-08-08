# ZYMO - Free Live Chat Support Widget Platform

ZYMO is a production-ready SaaS platform that provides free live chat support widgets for websites. Similar to Tawk.to, it allows website owners to embed customizable chat widgets and manage support conversations via a real-time dashboard.

## 🚀 Features

### For Website Owners
- **Free Forever**: No hidden fees, no credit card required
- **Multi-site Support**: Manage up to 3 websites with separate chat widgets
- **Real-time Chat**: Instant messaging with live typing indicators
- **Team Collaboration**: Invite team members with role-based permissions
- **Customizable Widget**: Custom colors, positions, and branding
- **Analytics**: Track conversations, response times, and satisfaction ratings

### For ZYMO Staff (Admins)
- **Global Dashboard**: View all chats across all websites
- **Cross-site Support**: Help answer chats on any website
- **User Management**: Manage all users and sites
- **System Monitoring**: Health checks and performance metrics

### Technical Features
- **MongoDB Backend**: Full data persistence
- **Real-time Communication**: Socket.IO powered
- **JWT Authentication**: Secure user sessions
- **Multi-tenant Architecture**: Data isolation per site
- **Responsive Design**: Works on all devices
- **Production Ready**: Security, rate limiting, error handling

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Database**: MongoDB with Mongoose
- **Frontend**: React, Tailwind CSS, Framer Motion
- **Authentication**: JWT tokens
- **Real-time**: Socket.IO
- **Deployment**: VPS-ready with PM2

## 📦 Installation

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd zymo-chat-platform
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/zymo
JWT_SECRET=your-super-secret-jwt-key
```

4. **Start MongoDB**
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Ubuntu
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. **Start the development server**
```bash
npm run dev
```

The application will be available at:
- Main app: http://localhost:3000
- API server: http://localhost:5000
- Widget script: http://localhost:5000/widget.js

### Production Deployment

#### Windows VPS Deployment
For detailed Windows VPS deployment instructions, see [README_windows.md](README_windows.md).

#### Quick Production Setup
```bash
# Install PM2
npm install -g pm2

# Build and deploy
npm run deploy

# Or use Windows deployment script
npm run deploy:windows
```

#### VPS Deployment (Ubuntu)

1. **Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

2. **Deploy Application**
```bash
# Clone repository
git clone <repository-url>
cd zymo-chat-platform

# Install dependencies
npm run install:all

# Build frontend
npm run build

# Set up environment
cp .env.example .env
# Edit .env with production values

# Start with PM2
pm2 start server/index.js --name zymo
pm2 startup
pm2 save
```

3. **Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/zymo
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/zymo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

4. **SSL Certificate (Optional)**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 🎯 Usage

### For Website Owners

1. **Sign Up**: Create an account at your ZYMO instance
2. **Add Website**: Create a new site with your domain
3. **Get Widget Code**: Copy the embed code from your site settings
4. **Embed Widget**: Add the code to your website HTML

Example embed code:
```html
<script src="https://zymo.chat/widget.js" 
        data-site-id="YOUR_SITE_ID" 
        data-primary-color="#0088ff" 
        data-position="right">
</script>
```html
<script src="https://zymo.chat/widget.js" 
        data-site-id="YOUR_SITE_ID" 
        data-primary-color="#0088ff" 
        data-position="right">
</script>
```
```

### For Developers

#### API Endpoints

**Authentication**
```bash
POST /api/auth/register
POST /api/auth/login
GET /api/auth/profile
```

**Sites**
```bash
GET /api/sites
POST /api/sites
GET /api/sites/:siteId
PUT /api/sites/:siteId
```

**Chats**
```bash
GET /api/chats/site/:siteId
GET /api/chats/:chatId
POST /api/chats/:chatId/message
POST /api/chats/:chatId/claim
```

**Widget API**
```bash
GET /api/widget/config/:siteId
POST /api/widget/chat
POST /api/widget/chat/:chatId/message
```

#### JavaScript API

```javascript
// Initialize widget
ZymoWidget.init({
  siteId: 'your-site-id',
  color: '#0088ff',
  position: 'right'
});

// Open widget
ZymoWidget.open();

// Send message
ZymoWidget.sendMessage('Hello!');

// Listen to events
ZymoWidget.on('chat_started', function(chatId) {
  console.log('Chat started:', chatId);
});
```

## 🗃️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  passwordHash: String,
  name: String,
  role: "owner" | "agent" | "zymo_admin",
  invitedBy: ObjectId,
  teamSites: [ObjectId],
  isOnline: Boolean,
  lastSeen: Date,
  createdAt: Date
}
```

### Sites Collection
```javascript
{
  _id: ObjectId,
  ownerId: ObjectId,
  name: String,
  domain: String,
  customization: {
    color: String,
    position: "right" | "left",
    navbarTitle: String
  },
  team: [{
    userId: ObjectId,
    role: "admin" | "agent",
    invitedAt: Date
  }],
  widgetCode: String,
  createdAt: Date
}
```

### Chats Collection
```javascript
{
  _id: ObjectId,
  siteId: ObjectId,
  visitorId: String,
  messages: [{
    from: "visitor" | "agent",
    senderId: ObjectId,
    text: String,
    timestamp: Date
  }],
  claimedBy: ObjectId,
  status: "open" | "claimed" | "closed",
  createdAt: Date
}
```

## 🔧 Configuration

### Environment Variables

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/zymo
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Widget Configuration

The widget can be customized with data attributes:

```html
<script src="https://your-domain.com/widget.js" 
        data-site-id="YOUR_SITE_ID"
        data-color="#0088ff"
        data-position="right"
        data-title="Chat with us"
        data-welcome-message="Hello! How can we help you today?">
</script>
```

## 🚀 Deployment Checklist

- [ ] MongoDB installed and running
- [ ] Environment variables configured
- [ ] Frontend built (`npm run build`)
- [ ] PM2 process started
- [ ] Nginx configured and SSL certificate installed
- [ ] Domain DNS configured
- [ ] Firewall rules updated
- [ ] Database backups configured
- [ ] Monitoring and logging set up

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Input validation and sanitization
- XSS protection
- CSRF protection
- Secure headers with Helmet

## 📊 Monitoring

### Health Check
```bash
curl https://your-domain.com/api/admin/health
```

### PM2 Monitoring
```bash
pm2 monit
pm2 logs zymo
```

### MongoDB Monitoring
```bash
mongo --eval "db.stats()"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: `/docs` route
- **Issues**: GitHub Issues
- **Email**: support@zymo.chat

## 🎉 Acknowledgments

- Built with Node.js, React, and MongoDB
- Inspired by Tawk.to and similar platforms
- Uses Tailwind CSS for styling
- Socket.IO for real-time communication

---

**ZYMO** - Free Live Chat Support Widget Platform

Made with ❤️ for better customer support 