const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

// Check ELECTRON_ENV to determine mode, default to 'prod'
const electronEnv = process.env.ELECTRON_ENV || 'prod';
const isDev = electronEnv === 'local';

// Disable GPU acceleration completely
app.disableHardwareAcceleration();

// Force software rendering and disable all GPU features
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-gl-drawing-for-tests');
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// Use desktop GL for software rendering (no GPU required)
app.commandLine.appendSwitch('use-gl', 'desktop');
app.commandLine.appendSwitch('enable-features', 'SkiaRenderer');

// Disable cache to prevent disk errors
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disk-cache-size', '0');

let mainWindow;

function createWindow() {
  // Create the browser window with widget-style properties
  mainWindow = new BrowserWindow({
    width: 350,
    height: 600,
    maxWidth: 400,
    maxHeight: 1000,
    minWidth: 350,
    minHeight: 350,
    resizable: true,
    frame: false, // Frameless window for widget
    transparent: false, // Transparent background
    alwaysOnTop: true, // Always on top
    skipTaskbar: false, // Show in taskbar
    closable: false, // Prevent closing the window
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true // Disable dev tools
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false,
    titleBarStyle: 'hidden',
    vibrancy: 'under-window', // macOS vibrancy effect
    visualEffectState: 'active'
  });

  // Determine which URL to load based on environment
  let startUrl;
  
  console.log('ELECTRON_ENV:', process.env.ELECTRON_ENV);
  console.log('isDev:', isDev);
  
  if (isDev) {
    // Local development mode - load from localhost
    startUrl = 'http://localhost:3000';
    console.log('Loading in LOCAL mode from:', startUrl);
  } else {
    // Production mode - load from deployed URL
    startUrl = 'https://sarya-connective-ujyd.onrender.com/';
    console.log('Loading in PRODUCTION mode from:', startUrl);
  }
  
  mainWindow.loadURL(startUrl);

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Log when page loads
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
    
    // Inject Electron flag and API
    mainWindow.webContents.executeJavaScript(`
      window.electron = true;
      window.electronAPI = {
        minimize: () => {
          console.log('ELECTRON_CMD:minimize');
          return Promise.resolve();
        },
        toggleAlwaysOnTop: () => {
          console.log('ELECTRON_CMD:toggle-always-on-top');
          return Promise.resolve(true);
        },
        setOpacity: (opacity) => {
          console.log('ELECTRON_CMD:set-opacity:' + opacity);
          return Promise.resolve();
        },
        getSettings: () => {
          return Promise.resolve({ opacity: 0.9, alwaysOnTop: true });
        }
      };
    `);
  });
  
  // Listen for console messages that contain window control commands
  mainWindow.webContents.on('console-message', (event, level, message) => {
    if (message.startsWith('ELECTRON_CMD:')) {
      const cmd = message.replace('ELECTRON_CMD:', '');
      const [action, ...params] = cmd.split(':');
      
      switch (action) {
        case 'minimize':
          mainWindow.minimize();
          break;
        case 'toggle-always-on-top':
          const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
          mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
          break;
        case 'set-opacity':
          const opacity = parseFloat(params[0]);
          if (!isNaN(opacity)) {
            mainWindow.setOpacity(opacity);
          }
          break;
        default:
          console.log('Unknown electron command:', action);
      }
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Position window at top-right of screen for widget
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    mainWindow.setPosition(width - 400, 50);
    
    // Hide scrollbars
    mainWindow.webContents.insertCSS(`
      ::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      body {
        overflow: hidden !important;
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
      html {
        overflow: hidden !important;
      }
    `);
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();
}

// IPC Handlers for window controls
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('toggle-always-on-top', () => {
  if (mainWindow) {
    const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
    return !isAlwaysOnTop;
  }
  return false;
});

ipcMain.handle('set-opacity', (event, opacity) => {
  if (mainWindow) {
    mainWindow.setOpacity(opacity);
  }
});

ipcMain.handle('get-settings', () => {
  if (mainWindow) {
    return {
      opacity: mainWindow.getOpacity(),
      alwaysOnTop: mainWindow.isAlwaysOnTop()
    };
  }
  return { opacity: 0.9, alwaysOnTop: true };
});

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            createWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { type: 'separator' },
        {
          label: 'Live Dashboard Mode',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(true);
              mainWindow.loadURL(isDev 
                ? 'http://localhost:3000/live-dashboard' 
                : `file://${path.join(__dirname, '../build/index.html')}#/live-dashboard`
              );
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Sarya Connective',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Sarya Connective',
              message: 'Sarya Connective',
              detail: 'Intelligent HR & Payroll Management System\nVersion 1.0.0\n\nBuilt with React, Node.js, and Electron'
            });
          }
        },
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/your-repo/sarya-connective');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // In development, ignore certificate errors
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior
    callback(false);
  }
});
