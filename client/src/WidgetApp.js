import React from 'react';
import FramelessWidget from './components/FramelessWidget';
import './index.css';

function WidgetApp() {
  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI;
  
  if (isElectron) {
    return <FramelessWidget />;
  }
  
  // Fallback for web browser
  return (
    <div style={{ 
      margin: 0, 
      padding: '10px', 
      backgroundColor: '#f5f5f5', 
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      <FramelessWidget />
    </div>
  );
}

export default WidgetApp;