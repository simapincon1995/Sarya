import React from 'react';
import AttendanceWidget from './AttendanceWidget';
import './index.css';

function WidgetApp() {
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
      <AttendanceWidget />
    </div>
  );
}

export default WidgetApp;