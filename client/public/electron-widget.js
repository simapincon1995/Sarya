const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Import optional dependencies
let autoLaunch, Store;
try {
  autoLaunch = require('electron-auto-launch');
  Store = require('electron-store');
} catch (err) {
  console.log('Optional dependencies not available:', err.message);
}

let mainWindow;
let store;

// Initialize persistent storage
if (Store) {
  store = new Store({
    defaults: {
      windowBounds: { width: 350, height: 400, x: 0, y: 0 },
      opacity: 0.9,
      alwaysOnTop: true,
      autoLaunch: true
    }
  });
}

function createWindow() {
  // Get saved window bounds or use defaults
  const savedBounds = store ? store.get('windowBounds') : { width: 350, height: 400, x: 0, y: 0 };
  
  // Create the browser window - frameless widget style
  mainWindow = new BrowserWindow({
    width: savedBounds.width || 350,
    height: savedBounds.height || 500,
    x: savedBounds.x,
    y: savedBounds.y,
    maxWidth: 450,
    maxHeight: 700,
    minWidth: 320,
    minHeight: 400,
    resizable: true,
    frame: false, // Frameless window
    transparent: false, // Use solid background with blur
    alwaysOnTop: store ? store.get('alwaysOnTop') : true, // Always on top
    skipTaskbar: false, // Show in taskbar for better UX
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload-widget.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false,
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin' && {
      vibrancy: 'under-window', // macOS vibrancy effect
      visualEffectState: 'active'
    })
  });

  // Load the widget app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/widget.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Set opacity from store
    if (store) {
      const opacity = store.get('opacity');
      mainWindow.setOpacity(opacity);
    }
    
    // Position window at top-right of screen if no saved position
    if (!store || !store.get('windowBounds.x')) {
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      
      mainWindow.setPosition(width - 400, 50);
    }
  });

  // Save window bounds when moved or resized
  if (store) {
    mainWindow.on('moved', () => {
      const bounds = mainWindow.getBounds();
      store.set('windowBounds', bounds);
    });

    mainWindow.on('resized', () => {
      const bounds = mainWindow.getBounds();
      store.set('windowBounds', bounds);
    });
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });

  // Handle new window requests
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC handlers for widget controls
ipcMain.handle('widget-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('widget-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('widget-toggle-always-on-top', () => {
  if (mainWindow) {
    const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
    if (store) {
      store.set('alwaysOnTop', !isAlwaysOnTop);
    }
    return !isAlwaysOnTop;
  }
});

ipcMain.handle('widget-set-opacity', (event, opacity) => {
  if (mainWindow) {
    mainWindow.setOpacity(opacity);
    if (store) {
      store.set('opacity', opacity);
    }
  }
});

ipcMain.handle('widget-get-settings', () => {
  if (store) {
    return {
      opacity: store.get('opacity'),
      alwaysOnTop: store.get('alwaysOnTop'),
      autoLaunch: store.get('autoLaunch')
    };
  }
  return { opacity: 0.9, alwaysOnTop: true, autoLaunch: true };
});

ipcMain.handle('widget-toggle-auto-launch', () => {
  if (autoLaunch && store) {
    const currentSetting = store.get('autoLaunch');
    const newSetting = !currentSetting;
    
    if (newSetting) {
      autoLaunch.enable();
    } else {
      autoLaunch.disable();
    }
    
    store.set('autoLaunch', newSetting);
    return newSetting;
  }
  return false;
});

ipcMain.handle('widget-move-window', (event, deltaX, deltaY) => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(x + deltaX, y + deltaY);
    
    // Save new position
    if (store) {
      const bounds = mainWindow.getBounds();
      store.set('windowBounds', bounds);
    }
  }
});

// Create a minimal menu for the widget
function createMenu() {
  const template = [
    {
      label: 'Widget',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            if (mainWindow) mainWindow.minimize();
          }
        },
        {
          label: 'Always on Top',
          type: 'checkbox',
          checked: store ? store.get('alwaysOnTop') : true,
          click: (menuItem) => {
            if (mainWindow) {
              mainWindow.setAlwaysOnTop(menuItem.checked);
              if (store) store.set('alwaysOnTop', menuItem.checked);
            }
          }
        },
        {
          label: 'Auto Launch',
          type: 'checkbox',
          checked: store ? store.get('autoLaunch') : true,
          click: (menuItem) => {
            if (autoLaunch && store) {
              if (menuItem.checked) {
                autoLaunch.enable();
              } else {
                autoLaunch.disable();
              }
              store.set('autoLaunch', menuItem.checked);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Opacity',
          submenu: [
            { label: '100%', click: () => { if (mainWindow) { mainWindow.setOpacity(1.0); if (store) store.set('opacity', 1.0); } } },
            { label: '90%', click: () => { if (mainWindow) { mainWindow.setOpacity(0.9); if (store) store.set('opacity', 0.9); } } },
            { label: '80%', click: () => { if (mainWindow) { mainWindow.setOpacity(0.8); if (store) store.set('opacity', 0.8); } } },
            { label: '70%', click: () => { if (mainWindow) { mainWindow.setOpacity(0.7); if (store) store.set('opacity', 0.7); } } },
            { label: '60%', click: () => { if (mainWindow) { mainWindow.setOpacity(0.6); if (store) store.set('opacity', 0.6); } } }
          ]
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            require('electron').dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About HRMS Widget',
              message: 'HRMS Sticky Note Widget',
              detail: 'A transparent, always-on-top attendance widget\nVersion 1.0.0\n\nFeatures:\n• Frameless & Transparent\n• Always on Top\n• Auto Launch\n• Draggable\n• Persistent Settings'
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  // Setup auto-launch if available
  if (autoLaunch && store) {
    const shouldAutoLaunch = store.get('autoLaunch');
    if (shouldAutoLaunch) {
      autoLaunch.enable();
    }
  }

  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// Additional security measures
app.on('ready', () => {
  // Disable navigation to external protocols
  app.setAsDefaultProtocolClient('hrms-widget');
});

// Handle protocol for auto-updates or deep linking (optional)
app.setAsDefaultProtocolClient('hrms-attendance');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}