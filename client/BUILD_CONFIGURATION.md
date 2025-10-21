# Build Configuration Guide

This document explains how to build different versions of the Sarya Connective application.

## Development Commands

### 1. Full HRMS Application
```bash
# Start full HRMS application in development mode
npm run start
# Opens at http://localhost:3000 with complete HRMS features
```

### 2. Attendance Widget Only
```bash
# Start attendance widget in development mode
npm run widget
# Opens at http://localhost:3001 with only attendance widget

# Alternative PowerShell command
npm run widget-ps
# Same as above but uses PowerShell script
```

## Build Types

### 1. Web Application (Default)
The full HRMS web application with all features including:
- Complete dashboard
- Employee management
- Attendance tracking
- Leave management
- Payroll management
- Template management
- Holiday calendar
- Settings and configuration

**Commands:**
```bash
# Development
npm run start

# Production build
npm run build

# Electron app (full HRMS)
npm run electron-build
```

### 2. Attendance Widget
A lightweight desktop widget focused only on attendance functions:
- Simple check-in/out interface
- Break management
- Offline support
- Minimal UI footprint

**Commands:**
```bash
# Widget development
npm run widget

# Widget production build
npm run build:widget

# Widget Electron app
npm run widget-build
```

## Build Process

### Web Build Process
1. Uses `client/src/index.js` as entry point
2. Loads the full `App` component with all routes
3. Includes all HRMS features and components
4. Outputs to `client/build/index.html`

### Widget Build Process
1. Uses `client/src/index.js` with `REACT_APP_ENTRY_POINT=widget` environment variable
2. Loads only the `WidgetApp` component
3. Includes only attendance-related functionality
4. Outputs to `client/build/widget.html`
5. Uses `client/public/electron-widget.js` for Electron configuration

## File Structure

```
client/
├── src/
│   ├── index.js          # Main entry point (handles both web and widget)
│   ├── widget.js          # Dedicated widget entry point (unused)
│   ├── App.js             # Full HRMS application
│   ├── WidgetApp.js       # Attendance widget only
│   └── AttendanceWidget.js # Core widget component
├── public/
│   ├── electron.js        # Electron config for full app
│   ├── electron-widget.js # Electron config for widget
│   ├── index.html         # HTML template for web app
│   └── widget.html        # HTML template for widget
├── build-script.js        # Custom build script
└── package.json           # Build commands
```

## Environment Variables

- `REACT_APP_ENTRY_POINT=widget` - Triggers widget build mode
- `ELECTRON_MAIN=public/electron-widget.js` - Uses widget Electron config

## Development vs Production

### Development Mode
- **Full HRMS**: `npm run start` → `http://localhost:3000`
- **Widget Only**: `npm run widget` → `http://localhost:3001` (widget mode)
- Hot reload enabled
- DevTools available

### Production Mode
- Web app: `client/build/index.html`
- Widget: `client/build/widget.html`
- Optimized bundles
- Minified code

## Usage Examples

### Development Testing
```bash
# Test full HRMS application
npm run start
# Open http://localhost:3000

# Test attendance widget only
npm run widget
# Open http://localhost:3001 (widget mode)

# Alternative PowerShell command
npm run widget-ps
# Same as above but uses PowerShell script
```

### Building for Production
```bash
# Build full web app
npm run build
# Outputs optimized web app to client/build/

# Build widget app
npm run build:widget
# Outputs widget app to client/build/widget.html
```

### Electron Applications
```bash
# Full HRMS Electron app
npm run electron-build
# Outputs to client/dist/

# Widget Electron app
npm run widget-build
# Outputs widget app to client/dist/
```

## Troubleshooting

### Widget Not Loading
1. Check if `widget.html` exists in build directory
2. Verify `REACT_APP_ENTRY_POINT=widget` is set during build
3. Ensure `electron-widget.js` is being used

### Web App Not Loading
1. Check if `index.html` exists in build directory
2. Verify no `REACT_APP_ENTRY_POINT` environment variable is set
3. Ensure `electron.js` is being used for Electron builds

### Build Failures
1. Clear build cache: `rm -rf client/build`
2. Reinstall dependencies: `npm run install-all`
3. Check for syntax errors in source files
