const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  // Create the browser window with widget-style properties
  mainWindow = new BrowserWindow({
    width: 350,
    height: 400,
    maxWidth: 400,
    maxHeight: 600,
    minWidth: 300,
    minHeight: 350,
    resizable: true,
    frame: false, // Frameless window for widget
    transparent: true, // Transparent background
    alwaysOnTop: true, // Always on top
    skipTaskbar: false, // Show in taskbar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      sandbox: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false,
    titleBarStyle: 'hidden',
    vibrancy: 'under-window', // macOS vibrancy effect
    visualEffectState: 'active'
  });

  // Load the app (which will detect Electron and load WidgetApp)
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Position window at top-right of screen for widget
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    mainWindow.setPosition(width - 400, 50);
    
    // Set opacity for widget
    mainWindow.setOpacity(0.9);
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
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
        {
          label: 'Close Window',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (mainWindow) {
              mainWindow.close();
            }
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
