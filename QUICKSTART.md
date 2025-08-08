# ZYMO Quick Start Guide

Get ZYMO up and running in 5 minutes! 🚀

## Prerequisites

- Node.js 16+ installed
- MongoDB 4.4+ installed and running
- Git (optional)

## Quick Installation

### 1. Clone or Download
```bash
# If you have the code already, skip this step
# Otherwise, download and extract the ZIP file
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Set Up Environment
Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/zymo
JWT_SECRET=your-super-secret-jwt-key
```

### 4. Start MongoDB
```bash
# On macOS
brew services start mongodb-community

# On Ubuntu
sudo systemctl start mongod

# On Windows
# Start MongoDB service from Services
```

### 5. Start Development Server
```bash
npm run dev
```

### 6. Access ZYMO
- **Main App**: http://localhost:3000
- **API Server**: http://localhost:5000
- **Widget Script**: http://localhost:5000/widget.js

## First Steps

### 1. Create Your Account
1. Go to http://localhost:3000
2. Click "Get Started" or "Sign Up"
3. Fill in your details and create an account

### 2. Add Your First Website
1. Log in to your dashboard
2. Click "Add New Site"
3. Enter your website details:
   - **Name**: Your website name
   - **Domain**: yourdomain.com
   - **Color**: Choose your brand color
   - **Position**: Right or left

### 3. Get Your Widget Code
1. Go to your site settings
2. Copy the embed code
3. Add it to your website's HTML

Example embed code:
```html
<script src="https://zymo.chat/widget.js" 
        data-site-id="YOUR_SITE_ID" 
        data-primary-color="#0088ff" 
        data-position="right">
</script>
```

### 4. Test the Widget
1. Open your website in a browser
2. Look for the chat widget in the bottom corner
3. Click it to start a conversation
4. Check your dashboard to see the chat

## Production Deployment

### Option 1: VPS Deployment (Recommended)
```bash
# On your Ubuntu VPS
chmod +x deploy.sh
./deploy.sh your-domain.com admin@your-domain.com
```

### Option 2: Manual Deployment
1. Build the frontend: `npm run build`
2. Set up PM2: `pm2 start server/index.js --name zymo`
3. Configure Nginx (see README.md)
4. Set up SSL with Let's Encrypt

## Common Issues

### MongoDB Connection Error
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod
```

### Port Already in Use
```bash
# Check what's using the port
lsof -i :5000

# Kill the process or change the port in .env
```

### Widget Not Loading
1. Check browser console for errors
2. Verify the widget script URL is correct
3. Make sure your site ID is valid
4. Check if the API server is running

## Next Steps

### For Website Owners
- [ ] Customize your widget appearance
- [ ] Invite team members
- [ ] Set up working hours
- [ ] Configure notifications

### For Developers
- [ ] Read the API documentation at `/docs`
- [ ] Explore the JavaScript API
- [ ] Customize the widget behavior
- [ ] Integrate with your existing systems

### For Admins
- [ ] Access the admin panel at `/admin`
- [ ] Monitor all sites and chats
- [ ] Manage users and permissions
- [ ] Check system health

## Support

- **Documentation**: `/docs` route
- **Issues**: Check the console for error messages
- **Community**: GitHub Discussions

## What's Next?

Once you have ZYMO running, you can:

1. **Customize the Widget**: Change colors, position, and messages
2. **Add Team Members**: Invite colleagues to help with support
3. **Set Up Notifications**: Get alerts for new chats
4. **Analyze Performance**: Track response times and satisfaction
5. **Scale Up**: Add more websites (up to 3 on free plan)

---

**Need help?** Check the full documentation in the README.md file or visit `/docs` in your ZYMO instance.

Happy chatting! 💬 