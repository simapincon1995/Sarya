import React, { useState, useEffect } from 'react';
import AttendanceWidget from '../AttendanceWidget';
import '../AttendanceWidget.css';
import './FramelessWidget.css';

const FramelessWidget = () => {
  const [showControls, setShowControls] = useState(false);
  const [settings, setSettings] = useState({ opacity: 0.9, alwaysOnTop: true });

  useEffect(() => {
    // Load settings from Electron
    if (window.electronAPI) {
      window.electronAPI.getSettings().then(s => {
        setSettings(s);
      });
    }
  }, []);

  // Dragging is handled by CSS -webkit-app-region: drag
  // No JavaScript needed for basic dragging

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  const handleToggleAlwaysOnTop = async () => {
    if (window.electronAPI) {
      const newState = await window.electronAPI.toggleAlwaysOnTop();
      setSettings(prev => ({ ...prev, alwaysOnTop: newState }));
    }
  };

  const handleOpacityChange = (opacity) => {
    window.electronAPI?.setOpacity(opacity);
    setSettings(prev => ({ ...prev, opacity }));
  };

  return (
    <div 
      className="frameless-widget-container"
      style={{ 
        opacity: settings.opacity
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="widget-wrapper">
        {/* Drag Handle / Header */}
        <div 
          className="widget-drag-handle"
        >
          <div className="widget-header-controls">
            {showControls && (
              <>
                <div className="widget-controls">
                  <button 
                    className="widget-control-btn opacity-btn"
                    title="Opacity"
                    onClick={() => handleOpacityChange(settings.opacity === 1.0 ? 0.8 : 1.0)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" opacity={settings.opacity} />
                    </svg>
                  </button>
                  <button 
                    className={`widget-control-btn pin-btn ${settings.alwaysOnTop ? 'active' : ''}`}
                    title="Always on Top"
                    onClick={handleToggleAlwaysOnTop}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h10v-2l-2-2zm-4 0V4h2v8h-2zm-5.5 10h9a.5.5 0 0 0 .5-.5V20H7v1.5a.5.5 0 0 0 .5.5z"/>
                    </svg>
                  </button>
                  <button 
                    className="widget-control-btn minimize-btn"
                    title="Minimize"
                    onClick={handleMinimize}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13H5v-2h14v2z"/>
                    </svg>
                  </button>
                  <button 
                    className="widget-control-btn close-btn"
                    title="Close"
                    onClick={handleClose}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Widget Content */}
        <div className="widget-content-wrapper">
          <AttendanceWidget />
        </div>
      </div>
    </div>
  );
};

export default FramelessWidget;

