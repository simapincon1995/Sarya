# Frameless Desktop Widget for Electron

A beautiful, frameless desktop widget for the HRMS attendance system built with Electron and React.

## Features

✅ **Frameless Design** - Clean, modern interface without window borders
✅ **Draggable** - Click and drag from the header to move the widget
✅ **Always on Top** - Toggle to keep widget visible above all windows
✅ **Opacity Control** - Adjust transparency (100% or 80%)
✅ **Minimize/Close** - Standard window controls
✅ **Glass Morphism** - Beautiful blur effects with backdrop filter
✅ **Auto-launch** - Optional startup with system
✅ **Persistent Settings** - Remembers position, opacity, and preferences
✅ **Responsive** - Adapts to different screen sizes

## Files Created/Modified

### New Files:
1. **`client/src/components/FramelessWidget.js`** - Main frameless widget component
2. **`client/src/components/FramelessWidget.css`** - Styles for frameless widget

### Modified Files:
1. **`client/src/WidgetApp.js`** - Updated to use FramelessWidget
2. **`client/public/electron-widget.js`** - Enhanced window configuration
3. **`client/public/preload-widget.js`** - Added moveWindow IPC handler

## How It Works

### Window Configuration
The Electron window is configured with:
- `frame: false` - Removes window frame
- `transparent: false` - Solid background with CSS blur
- `alwaysOnTop: true` - Stays above other windows
- `resizable: true` - Can be resized

### Dragging
The header uses CSS `-webkit-app-region: drag` to enable native window dragging. Control buttons use `-webkit-app-region: no-drag` to remain clickable.

### Controls
The widget header includes:
- **Opacity Toggle** - Switch between 100% and 80% opacity
- **Pin/Unpin** - Toggle always-on-top mode
- **Minimize** - Minimize to taskbar
- **Close** - Close the widget

Controls appear on hover for a clean interface.

## Usage

### Development

1. **Build the widget:**
   ```bash
   cd client
   npm run build:widget
   ```

2. **Run in Electron:**
   ```bash
   npm run widget-electron
   ```

### Production Build

1. **Build widget:**
   ```bash
   cd client
   npm run build:widget
   ```

2. **Package for distribution:**
   ```bash
   npm run widget-build
   ```

This creates platform-specific installers in `client/dist-widget/`:
- Windows: `.exe` installer
- macOS: `.dmg` file
- Linux: `.AppImage`

## Customization

### Size & Position
Default size: 350x500px
- Min: 320x400px
- Max: 450x700px

Window position is saved automatically when moved or resized.

### Colors & Styling
Edit `client/src/components/FramelessWidget.css` to customize:
- Header gradient colors
- Background blur intensity
- Control button styles
- Border radius

### Features
Edit `client/src/components/FramelessWidget.js` to:
- Add more control buttons
- Change opacity levels
- Add additional settings

## Electron API Methods

The widget uses these Electron APIs:

```javascript
window.electronAPI.minimize()              // Minimize window
window.electronAPI.close()                 // Close window
window.electronAPI.toggleAlwaysOnTop()     // Toggle always-on-top
window.electronAPI.setOpacity(opacity)    // Set opacity (0.0 - 1.0)
window.electronAPI.getSettings()          // Get saved settings
window.electronAPI.toggleAutoLaunch()     // Toggle auto-launch
```

## Styling Details

### Glass Morphism Effect
```css
background: rgba(255, 255, 255, 0.9);
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
```

### Drag Handle
```css
-webkit-app-region: drag;  /* Enable dragging */
```

### Control Buttons
```css
-webkit-app-region: no-drag;  /* Disable dragging on buttons */
```

## Platform-Specific Features

### macOS
- Vibrancy effects (`under-window`)
- Native look and feel
- Better blur effects

### Windows
- Standard window behavior
- Taskbar integration
- Native minimize/close

### Linux
- Works with major desktop environments
- AppImage format for easy distribution

## Troubleshooting

### Widget not appearing
- Check if Electron is running correctly
- Verify build completed successfully
- Check console for errors

### Controls not working
- Ensure `preload-widget.js` is loaded correctly
- Check IPC handlers in `electron-widget.js`
- Verify `window.electronAPI` is available

### Dragging not working
- Ensure CSS `-webkit-app-region: drag` is applied
- Check that control buttons have `-webkit-app-region: no-drag`
- Verify Electron version supports dragging

### Window position not saving
- Check `electron-store` is installed
- Verify store is initialized in `electron-widget.js`
- Check file permissions for config storage

## Future Enhancements

Potential improvements:
- [ ] Theme support (light/dark)
- [ ] Custom color schemes
- [ ] Resize handles
- [ ] Widget presets (sizes)
- [ ] Multi-monitor support
- [ ] Keyboard shortcuts
- [ ] System tray integration
- [ ] Notification support

## License

Part of the Sarya Connective HRMS project.


