# HRMS Sticky Note Widget

A transparent, frameless, always-on-top electron widget that works like a sticky note for your HRMS attendance tracking.

## Features

✅ **Transparent & Frameless** - `frame: false, transparent: true`  
✅ **Always Visible** - `alwaysOnTop: true`  
✅ **Auto Start** - `electron-auto-launch`  
✅ **Drag Window** - `-webkit-app-region: drag`  
✅ **Persistent Data** - `electron-store`  
✅ **Optional Opacity** - CSS `background: rgba(..., 0.8)`  

## Installation & Setup

### 1. Install Dependencies

```bash
# Install optional dependencies for widget features
npm run install-widget-deps

# Or install manually
npm install electron-auto-launch electron-store --save-optional
```

### 2. Development Mode

```bash
# Build and run the widget in development
npm run widget-dev

# Or run individual commands
npm run build:widget
npm run widget-electron
```

### 3. Production Build

```bash
# Build the widget for production
npm run widget-build
```

## Widget Controls

### Drag Handle
- **Drag**: Click and drag the colored header bar to move the widget
- **Settings**: Click the ⚙ gear icon to access settings
- **Minimize**: Click the − button to minimize
- **Close**: Click the × button to close

### Settings Panel
- **Always on Top**: Toggle whether the widget stays above other windows
- **Auto Launch**: Toggle whether the widget starts automatically with Windows
- **Opacity**: Adjust transparency from 60% to 100%

## Widget Features

### Transparent Background
- Uses `backdrop-filter: blur(10px)` for modern glass effect
- Semi-transparent background with `rgba(255, 255, 255, 0.9)`
- Rounded corners and subtle shadows

### Always on Top
- Widget stays visible above all other applications
- Can be toggled on/off via settings or menu

### Auto Launch
- Automatically starts when Windows boots
- Uses `electron-auto-launch` for system integration
- Can be enabled/disabled via settings

### Draggable Window
- Drag handle with `-webkit-app-region: drag`
- Control buttons excluded from drag area with `-webkit-app-region: no-drag`
- Smooth dragging experience

### Persistent Settings
- Window position and size saved automatically
- Opacity, always-on-top, and auto-launch preferences saved
- Uses `electron-store` for reliable data persistence

## File Structure

```
client/
├── public/
│   ├── electron-widget.js      # Main electron process for widget
│   ├── preload-widget.js       # Secure IPC bridge
│   └── widget.html             # Widget HTML with styling and controls
├── package.json                # Updated with widget dependencies
└── build-script.js            # Build script for widget
```

## Configuration

### Window Settings
- **Size**: 350x400px (minimum), 400x600px (maximum)
- **Position**: Top-right by default, remembers last position
- **Frame**: Frameless with custom drag handle
- **Transparency**: Adjustable opacity with glass effect

### Auto Launch
The widget can be configured to start automatically with Windows:

```javascript
// In electron-widget.js
if (autoLaunch && store) {
  const shouldAutoLaunch = store.get('autoLaunch');
  if (shouldAutoLaunch) {
    autoLaunch.enable();
  }
}
```

## Usage After Login

1. **First Run**: The widget will appear in the top-right corner
2. **Auto Launch**: If enabled, it will start automatically on next boot
3. **Positioning**: Drag to your preferred location - position is saved
4. **Settings**: Click ⚙ to adjust opacity, always-on-top, and auto-launch
5. **Minimize**: Use − to minimize when not needed
6. **Close**: Use × to close completely

## Technical Details

### Security
- Uses `contextIsolation: true` and `nodeIntegration: false`
- Secure IPC communication via preload script
- No direct access to Node.js APIs from renderer

### Performance
- Lightweight and efficient
- Minimal memory footprint
- Smooth animations and transitions

### Cross-Platform
- Works on Windows, macOS, and Linux
- Platform-specific optimizations included
- Native look and feel on each platform

## Troubleshooting

### Widget Not Starting
1. Check if dependencies are installed: `npm run install-widget-deps`
2. Verify build: `npm run build:widget`
3. Check console for errors

### Auto Launch Not Working
1. Ensure `electron-auto-launch` is installed
2. Check Windows startup programs
3. Try disabling and re-enabling auto launch

### Transparency Issues
1. Check Windows transparency settings
2. Verify graphics drivers are up to date
3. Try adjusting opacity in settings

## Development

### Adding New Features
1. Update `electron-widget.js` for main process changes
2. Update `preload-widget.js` for IPC methods
3. Update `widget.html` for UI changes
4. Test with `npm run widget-dev`

### Building for Distribution
```bash
# Build widget
npm run widget-build

# Output will be in dist-widget/ directory
```

The widget is now ready to use as a sticky note that stays on your screen and auto-launches after login!
