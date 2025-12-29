@echo off
echo Starting NoLSAF Development Servers...
echo.

REM Kill any existing node processes on ports 3000 and 4000
echo Checking for existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000"') do taskkill /F /PID %%a 2>nul

echo.
echo Starting servers...
echo API will run on http://localhost:4000
echo Web will run on http://localhost:3000
echo.
echo Press Ctrl+C to stop both servers
echo.

cd /d %~dp0
call npm run dev

pause

