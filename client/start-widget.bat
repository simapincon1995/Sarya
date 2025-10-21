@echo off
echo Starting Attendance Widget...
echo.
echo Setting environment variables...
set REACT_APP_ENTRY_POINT=widget
set PORT=3001
echo.
echo Starting React development server on port 3001...
echo Widget will be available at: http://localhost:3001
echo.
npm start