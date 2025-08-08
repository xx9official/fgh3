@echo off
setlocal
echo ========================================
echo Install Node.js (includes npm)
echo ========================================

:: Check admin (recommended for silent MSI install)
net session >nul 2>&1
if %errorlevel% NEQ 0 (
  echo Please run this script as Administrator.
  pause
  exit /b 1
)

:: Skip if Node is already installed
where node >nul 2>&1
if %errorlevel% EQU 0 (
  echo Node.js is already installed.
  node -v
  npm -v
  goto :done
)

:: Download Node.js LTS (x64)
echo Downloading Node.js LTS installer...
set "NODE_MSI=%TEMP%\node-lts-x64.msi"
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest https://nodejs.org/dist/v18.20.3/node-v18.20.3-x64.msi -OutFile '%NODE_MSI%'"
if not exist "%NODE_MSI%" (
  echo Failed to download Node.js installer.
  pause
  exit /b 1
)

:: Silent install
echo Installing Node.js...
msiexec /i "%NODE_MSI%" /qn /norestart
if %errorlevel% NEQ 0 (
  echo Node.js installation failed.
  pause
  exit /b 1
)

:: Refresh PATH for current session (MSI normally sets system PATH)
set "PATH=%ProgramFiles%\nodejs;%PATH%"

:: Verify
echo Verifying installation...
where node >nul 2>&1 && node -v || echo Node not found in PATH
where npm  >nul 2>&1 && npm  -v || echo npm not found in PATH

:done
echo ========================================
echo Finished. Close and reopen your terminal if versions do not appear.
echo ========================================
pause
endlocal 