@echo off
echo Starting HRMS Development Server...
echo.

echo Starting Backend Server...
cd server
start "Backend Server" cmd /k "npm start"

echo.
echo Starting Frontend Client...
cd ..\client  
start "Frontend Client" cmd /k "npm start"

echo.
echo Development servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause