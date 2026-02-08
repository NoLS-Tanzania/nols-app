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

REM Best-effort: make Mapbox token available to the API process.
REM The token is commonly stored in apps\web\.env.local as NEXT_PUBLIC_MAPBOX_TOKEN.
if "%MAPBOX_ACCESS_TOKEN%"=="" (
	if exist "apps\web\.env.local" (
		for /f "usebackq tokens=1,* delims==" %%A in ("apps\web\.env.local") do (
			if /I "%%A"=="MAPBOX_ACCESS_TOKEN" set "MAPBOX_ACCESS_TOKEN=%%B"
			if /I "%%A"=="NEXT_PUBLIC_MAPBOX_TOKEN" set "MAPBOX_ACCESS_TOKEN=%%B"
		)
	)
)

call pnpm dev

pause

