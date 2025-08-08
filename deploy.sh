#!/bin/bash

# ZYMO Deployment Script
# This script automates the deployment of ZYMO on a Ubuntu VPS

set -e

echo "🚀 Starting ZYMO deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"admin@$DOMAIN"}

echo -e "${GREEN}Domain: $DOMAIN${NC}"
echo -e "${GREEN}Email: $EMAIL${NC}"

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Node.js
echo -e "${YELLOW}📦 Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
echo -e "${YELLOW}📦 Installing MongoDB...${NC}"
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2
echo -e "${YELLOW}📦 Installing PM2...${NC}"
sudo npm install -g pm2

# Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
sudo apt install nginx -y

# Install Certbot
echo -e "${YELLOW}📦 Installing Certbot...${NC}"
sudo apt install certbot python3-certbot-nginx -y

# Create application directory
echo -e "${YELLOW}📁 Setting up application directory...${NC}"
sudo mkdir -p /var/www/zymo
sudo chown $USER:$USER /var/www/zymo
cd /var/www/zymo

# Clone repository (replace with your repo URL)
echo -e "${YELLOW}📥 Cloning repository...${NC}"
# git clone https://github.com/your-username/zymo-chat-platform.git .
# For now, we'll assume the code is already there

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm run install:all

# Create environment file
echo -e "${YELLOW}⚙️ Creating environment configuration...${NC}"
cat > .env << EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/zymo
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://$DOMAIN
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
BCRYPT_ROUNDS=12
SESSION_SECRET=$(openssl rand -base64 32)
WIDGET_CDN_URL=https://$DOMAIN
WIDGET_DOMAIN=$DOMAIN
ADMIN_EMAIL=$EMAIL
ADMIN_PASSWORD=admin123
ENABLE_METRICS=true
LOG_LEVEL=info
EOF

# Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
npm run build

# Create PM2 ecosystem file
echo -e "${YELLOW}⚙️ Creating PM2 configuration...${NC}"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'zymo',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start application with PM2
echo -e "${YELLOW}🚀 Starting application with PM2...${NC}"
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# Configure Nginx
echo -e "${YELLOW}⚙️ Configuring Nginx...${NC}"
sudo tee /etc/nginx/sites-available/zymo > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Main application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Widget script
    location /widget.js {
        proxy_pass http://localhost:5000/widget.js;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Static files
    location /static/ {
        proxy_pass http://localhost:5000/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/api/admin/health;
        access_log off;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/zymo /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Get SSL certificate
echo -e "${YELLOW}🔒 Getting SSL certificate...${NC}"
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# Create admin user
echo -e "${YELLOW}👤 Creating admin user...${NC}"
# This would typically be done through the application
# For now, we'll create a script to do it
cat > create-admin.js << EOF
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./server/models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);

    const admin = new User({
      email: process.env.ADMIN_EMAIL,
      passwordHash,
      name: 'ZYMO Admin',
      role: 'zymo_admin'
    });

    await admin.save();
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
EOF

node create-admin.js

# Create systemd service for MongoDB backup
echo -e "${YELLOW}💾 Setting up database backup...${NC}"
sudo tee /etc/systemd/system/zymo-backup.service > /dev/null << EOF
[Unit]
Description=ZYMO Database Backup
After=network.target

[Service]
Type=oneshot
User=root
ExecStart=/usr/bin/mongodump --db zymo --out /var/backups/zymo/\$(date +%%Y%%m%%d)
EOF

sudo tee /etc/systemd/system/zymo-backup.timer > /dev/null << EOF
[Unit]
Description=Run ZYMO backup daily
Requires=zymo-backup.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo mkdir -p /var/backups/zymo
sudo systemctl enable zymo-backup.timer
sudo systemctl start zymo-backup.timer

# Create monitoring script
echo -e "${YELLOW}📊 Setting up monitoring...${NC}"
cat > monitor.sh << 'EOF'
#!/bin/bash

# ZYMO Monitoring Script
LOG_FILE="/var/log/zymo-monitor.log"

echo "$(date): Checking ZYMO services..." >> $LOG_FILE

# Check if PM2 process is running
if ! pm2 list | grep -q "zymo.*online"; then
    echo "$(date): ZYMO process is down, restarting..." >> $LOG_FILE
    pm2 restart zymo
fi

# Check if MongoDB is running
if ! systemctl is-active --quiet mongod; then
    echo "$(date): MongoDB is down, restarting..." >> $LOG_FILE
    sudo systemctl restart mongod
fi

# Check if Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "$(date): Nginx is down, restarting..." >> $LOG_FILE
    sudo systemctl restart nginx
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "$(date): Disk usage is high: ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    echo "$(date): Memory usage is high: ${MEMORY_USAGE}%" >> $LOG_FILE
fi
EOF

chmod +x monitor.sh

# Add monitoring to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/zymo/monitor.sh") | crontab -

# Final status check
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}🌐 Your ZYMO instance is now available at: https://$DOMAIN${NC}"
echo -e "${GREEN}📊 PM2 Dashboard: pm2 monit${NC}"
echo -e "${GREEN}📝 Logs: pm2 logs zymo${NC}"
echo -e "${GREEN}🔧 Admin Panel: https://$DOMAIN/admin${NC}"
echo -e "${GREEN}📚 Documentation: https://$DOMAIN/docs${NC}"

# Show useful commands
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "  pm2 monit                    # Monitor application"
echo "  pm2 logs zymo               # View application logs"
echo "  pm2 restart zymo            # Restart application"
echo "  sudo systemctl status nginx # Check Nginx status"
echo "  sudo systemctl status mongod # Check MongoDB status"
echo "  sudo certbot renew --dry-run # Test SSL renewal"

echo -e "${GREEN}🎉 ZYMO is ready to use!${NC}" 