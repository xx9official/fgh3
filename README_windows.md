# ZYMO Chat Platform - Windows VPS Deployment Guide

This guide will help you deploy the ZYMO chat platform on a Windows VPS for production use.

## 🖥️ Prerequisites

### System Requirements
- Windows Server 2019/2022 or Windows 10/11
- 2GB RAM minimum (4GB recommended)
- 10GB free disk space
- Administrator access

### Software Requirements
- Node.js 16+ (LTS version recommended)
- MongoDB 4.4+
- Git (optional)
- IIS (for reverse proxy, optional)

## 📦 Installation Steps

### 1. Install Node.js
1. Download Node.js LTS from https://nodejs.org/
2. Run the installer with default settings
3. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

### 2. Install MongoDB
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer
3. Choose "Complete" installation
4. Install MongoDB Compass (GUI) if desired
5. Start MongoDB service:
   ```cmd
   net start MongoDB
   ```

### 3. Clone/Download Project
```cmd
git clone https://github.com/your-repo/zymo-chat.git
cd zymo-chat
```

### 4. Configure Environment
Create a `.env` file in the project root:
```env
NODE_ENV=production
PORT=3000
BASE_URL=https://zymo.chat
MONGODB_URI=mongodb://127.0.0.1:27017/zymo_production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### 5. Install Dependencies
```cmd
npm install
cd client
npm install
cd ..
```

### 6. Build Frontend
```cmd
cd client
npm run build
cd ..
```

## 🚀 Deployment

### Option 1: Using PM2 (Recommended)
```cmd
npm install -g pm2
pm2 start server/index.js --name "zymo-chat" --env production
pm2 startup
pm2 save
```

### Option 2: Using Windows Service
```cmd
npm install -g node-windows
npm run install-service
```

### Option 3: Manual Start
```cmd
npm start
```

## 🌐 Domain Configuration

### 1. DNS Setup
Point your domain to your VPS IP:
- A Record: `zymo.chat` → Your VPS IP
- A Record: `www.zymo.chat` → Your VPS IP

### 2. SSL Certificate
Install SSL certificate using CertifyTheWeb or manually:
1. Download CertifyTheWeb from https://certifytheweb.com/
2. Install and configure for your domain
3. Set up auto-renewal

### 3. IIS Reverse Proxy (Optional)
If using IIS as reverse proxy:
```xml
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyInboundRule1" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{CACHE_URL}" pattern="^(.*)" />
          </conditions>
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

## 🔧 Configuration

### MongoDB Security
1. Create admin user:
   ```javascript
   use admin
   db.createUser({
     user: "admin",
     pwd: "secure-password",
     roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase"]
   })
   ```

2. Enable authentication in `mongod.cfg`:
   ```yaml
   security:
     authorization: enabled
   ```

### Firewall Configuration
Open required ports:
```cmd
netsh advfirewall firewall add rule name="ZYMO HTTP" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="ZYMO HTTPS" dir=in action=allow protocol=TCP localport=443
netsh advfirewall firewall add rule name="ZYMO App" dir=in action=allow protocol=TCP localport=3000
```

## 📊 Monitoring

### PM2 Monitoring
```cmd
pm2 status
pm2 logs zymo-chat
pm2 monit
```

### MongoDB Monitoring
```cmd
mongosh --eval "db.serverStatus()"
```

## 🔄 Updates

### Update Application
```cmd
git pull
npm install
cd client && npm install && npm run build && cd ..
pm2 restart zymo-chat
```

### Update Dependencies
```cmd
npm update
pm2 restart zymo-chat
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port already in use**
   ```cmd
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **MongoDB not starting**
   ```cmd
   net start MongoDB
   ```

3. **PM2 not found**
   ```cmd
   npm install -g pm2
   ```

4. **SSL certificate issues**
   - Check certificate expiration
   - Verify domain binding in IIS
   - Check certificate path in configuration

### Logs Location
- Application logs: `pm2 logs zymo-chat`
- MongoDB logs: `C:\Program Files\MongoDB\Server\6.0\log\mongod.log`
- Windows Event Logs: Event Viewer → Windows Logs → Application

## 📞 Support

For deployment issues:
1. Check logs: `pm2 logs zymo-chat`
2. Verify environment variables
3. Test MongoDB connection
4. Check firewall settings

## 🔒 Security Checklist

- [ ] Change default JWT secret
- [ ] Enable MongoDB authentication
- [ ] Configure firewall rules
- [ ] Install SSL certificate
- [ ] Set up regular backups
- [ ] Enable Windows updates
- [ ] Configure antivirus exclusions

## 📈 Performance Optimization

1. **Node.js Optimization**
   ```cmd
   set NODE_OPTIONS=--max-old-space-size=2048
   ```

2. **MongoDB Optimization**
   - Enable WiredTiger compression
   - Configure appropriate memory limits
   - Set up proper indexes

3. **PM2 Clustering**
   ```cmd
   pm2 start server/index.js -i max --name "zymo-chat"
   ```

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Domain pointing to server
- [ ] MongoDB secured
- [ ] Firewall configured
- [ ] PM2 process running
- [ ] Frontend built
- [ ] Widget accessible
- [ ] Dashboard accessible
- [ ] Chat functionality tested 