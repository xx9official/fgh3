@echo off
echo ========================================
echo ZYMO Chat Platform - Windows Deployment
echo ========================================

REM Set environment variables
set NODE_ENV=production
set PORT=3000
set BASE_URL=https://zymo.chat
set MONGODB_URI=mongodb://127.0.0.1:27017/zymo_production
set JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

echo Environment variables set...

REM Install dependencies
echo Installing dependencies...
call npm install

REM Build frontend
echo Building frontend...
cd client
call npm install
call npm run build
cd ..

REM Install PM2 globally if not installed
echo Installing PM2...
call npm install -g pm2

REM Start the application with PM2
echo Starting application with PM2...
call pm2 start server/index.js --name "zymo-chat" --env production

echo ========================================
echo Deployment completed!
echo ========================================
echo.
echo Application is running on port %PORT%
echo Dashboard: https://zymo.chat
echo Widget: https://zymo.chat/widget.js
echo.
echo PM2 Commands:
echo   pm2 status          - Check status
echo   pm2 logs zymo-chat  - View logs
echo   pm2 restart zymo-chat - Restart app
echo   pm2 stop zymo-chat  - Stop app
echo.
pause 