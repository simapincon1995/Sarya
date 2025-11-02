const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Widget controls
  minimize: () => ipcRenderer.invoke('widget-minimize'),
  close: () => ipcRenderer.invoke('widget-close'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('widget-toggle-always-on-top'),
  setOpacity: (opacity) => ipcRenderer.invoke('widget-set-opacity', opacity),
  getSettings: () => ipcRenderer.invoke('widget-get-settings'),
  toggleAutoLaunch: () => ipcRenderer.invoke('widget-toggle-auto-launch'),
  moveWindow: (deltaX, deltaY) => ipcRenderer.invoke('widget-move-window', deltaX, deltaY),
  
  // Platform info
  platform: process.platform,
  
  // Event listeners
  onSettingsChanged: (callback) => {
    ipcRenderer.on('settings-changed', callback);
  },
  
  removeSettingsListener: (callback) => {
    ipcRenderer.removeListener('settings-changed', callback);
  }
});
