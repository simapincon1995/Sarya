const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  // Create the browser window - small widget size
  mainWindow = new BrowserWindow({
    width: 380,
    height: 500,
    maxWidth: 400,
    maxHeight: 600,
    minWidth: 350,
    minHeight: 400,
    resizable: true,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      sandbox: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false,
    titleBarStyle: 'default',
    alwaysOnTop: false
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
    
    // Position window at top-right of screen
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    mainWindow.setPosition(width - 400, 50);
  });

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

// Create a minimal menu for the widget
function createMenu() {
  const template = [
    {
      label: 'App',
      submenu: [
        {
          label: 'About',
          click: () => {
            require('electron').dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Attendance Widget',
              message: 'HRMS Attendance Widget',
              detail: 'Simple desktop attendance tracker'
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
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        {
          label: 'Always on Top',
          type: 'checkbox',
          click: (menuItem) => {
            mainWindow.setAlwaysOnTop(menuItem.checked);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
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