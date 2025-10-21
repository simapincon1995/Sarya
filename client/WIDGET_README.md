# HRMS Attendance Desktop Widget

A simple, cross-platform desktop attendance tracker built with Electron.

## Features

- **Simple Interface**: Clean, minimal UI focused only on attendance functions
- **Offline Support**: Stores attendance events locally when offline and syncs when connection is restored
- **Cross-Platform**: Works on Windows, Mac, and Linux
- **Real-time Status**: Shows current attendance status (Working, On Break, etc.)
- **Secure**: JWT-based authentication with the HRMS backend

## Widget Functions

### Login
- Enter username and password to authenticate
- Automatically logs the login event

### Attendance Actions
- **Punch In / Start Work**: Records the start of your work day
- **Start Break**: Marks when you start a break
- **Stop Break**: Marks when you return from break
- **Punch Out**: Records the end of your work day
- **Logout**: Logs out and returns to login screen

## Status Indicators

- 🔴 **Logged Out**: Not authenticated
- 🟡 **Logged In**: Authenticated but not yet working
- 🟢 **Working**: Currently working
- 🔵 **On Break**: Currently on break

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- HRMS backend server running

### Quick Start

#### Windows
1. Double-click `start-widget.bat` or
2. Run in PowerShell: `.\start-widget.ps1`

#### Manual Start
```bash
# Install dependencies (first time only)
npm install

# Start the widget in development mode
npm run widget-dev

# Or build and run as standalone app
npm run widget-build
```

## Configuration

### API Endpoint
Set the backend API URL in environment variables:
```bash
REACT_APP_API_URL=http://your-hrms-server:5000/api
```

### Default Settings
- **Default API URL**: `http://localhost:5000/api`
- **Widget Size**: 350px × 500px
- **Position**: Top-right corner of screen (adjustable)

## Offline Functionality

The widget automatically handles offline scenarios:

1. **Event Storage**: When offline, all attendance events are stored locally
2. **Auto-Sync**: When connection is restored, events are automatically synced
3. **Status Indicator**: Shows online/offline status and pending sync count
4. **Data Persistence**: Login state and pending events survive app restarts

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Local Storage**: Encrypted local storage for sensitive data
- **Single Instance**: Prevents multiple widget instances
- **Secure Communications**: HTTPS support for production environments

## Widget Behavior

### Auto-Positioning
- Opens in top-right corner of screen
- Remember position between sessions
- Stays on top option available

### Data Persistence
- Login credentials are remembered
- Current status persists across restarts
- Pending offline events are saved

### Error Handling
- Graceful offline/online transitions
- Automatic retry for failed requests
- User-friendly error messages

## Development

### Project Structure
```
client/
├── src/
│   ├── AttendanceWidget.js      # Main widget component
│   ├── AttendanceWidget.css     # Widget styles
│   ├── WidgetApp.js            # Widget app wrapper
│   └── widget.js               # Widget entry point
├── public/
│   ├── electron-widget.js       # Electron main process for widget
│   └── widget.html             # Widget HTML template
├── start-widget.bat            # Windows batch launcher
└── start-widget.ps1            # PowerShell launcher
```

### API Endpoints Used
- `POST /api/auth/login` - User authentication
- `POST /api/attendance/event` - Attendance event recording

### Building for Production
```bash
# Build the widget for distribution
npm run widget-build

# The built app will be in the dist/ folder
```

## Troubleshooting

### Common Issues

1. **Widget won't start**
   - Ensure Node.js is installed
   - Run `npm install` in the client directory
   - Check if port 3000 is available

2. **Can't login**
   - Verify backend server is running
   - Check API URL configuration
   - Ensure user credentials are correct

3. **Events not syncing**
   - Check internet connection
   - Verify backend server is accessible
   - Check browser developer tools for errors

### Debug Mode
```bash
# Start with debug logging
npm run widget-dev
```
Then open Developer Tools in the widget (Ctrl+Shift+I) to see console logs.

## Support

For issues or questions:
1. Check the console logs in Developer Tools
2. Verify backend server connectivity
3. Check the HRMS server logs for API errors

## Version
Current Version: 1.0.0

Built with:
- Electron
- React
- Node.js