@echo off
setlocal ENABLEDELAYEDEXPANSION
echo ========================================
echo ZYMO - Windows Setup Script
echo ========================================

:: Check for administrator privileges
net session >nul 2>&1
if %errorlevel% NEQ 0 (
  echo Please run this script as Administrator.
  pause
  exit /b 1
)

:: Detect Node.js
where node >nul 2>&1
if %errorlevel% NEQ 0 (
  echo Node.js not found. Installing LTS...
  powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest https://nodejs.org/dist/v18.20.3/node-v18.20.3-x64.msi -OutFile %TEMP%\node.msi"
  msiexec /i %TEMP%\node.msi /qn /norestart
  setx PATH "%ProgramFiles%\nodejs;!PATH!"
) else (
  echo Node.js detected.
)

:: Detect Git (optional but recommended)
where git >nul 2>&1
if %errorlevel% NEQ 0 (
  echo Git not found. Installing...
  powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/Git-2.45.2-64-bit.exe -OutFile %TEMP%\git-setup.exe"
  start /wait %TEMP%\git-setup.exe /VERYSILENT /NORESTART
) else (
  echo Git detected.
)

:: Refresh PATH for current session
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles%\Git\bin;%PATH%"

:: Install PM2 globally
echo Installing PM2...
npm install -g pm2

:: Create server .env if missing
if not exist server\.env (
  echo Creating server/.env...
  > server\.env echo NODE_ENV=production
  >> server\.env echo PORT=5000
  >> server\.env echo MONGODB_URI=mongodb://127.0.0.1:27017/zymo
  >> server\.env echo JWT_SECRET=CHANGE_ME
  >> server\.env echo BASE_URL=http://localhost:5000
)

:: Create client .env if missing
if not exist client\.env (
  echo Creating client/.env...
  > client\.env echo REACT_APP_API_URL=http://localhost:5000
)

:: Install dependencies
echo Installing server dependencies...
npm install

echo Installing client dependencies...
pushd client
npm install
echo Building client...
npm run build
popd

:: Start server with PM2
echo Starting server with PM2...
pm2 start server/index.js --name zymo --env production
pm2 save

echo ========================================
echo Setup complete.
echo - Server on http://localhost:5000
echo - Client build in client/build
echo Use pm2 status / pm2 logs zymo to manage the process.
echo ========================================
pause
endlocal 