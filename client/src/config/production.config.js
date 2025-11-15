/**
 * Production Configuration
 * Contains all production URLs and settings for the Electron desktop app
 */

const PRODUCTION_CONFIG = {
  // React App URL (Frontend)
  APP_URL: 'https://sarya-connective-ujyd.onrender.com',
  
  // API Base URL (Backend)
  API_URL: 'https://sarya-426p.onrender.com/api',
  
  // WebSocket URL (For real-time updates)
  SOCKET_URL: 'https://sarya-426p.onrender.com',
  
  // Environment
  ENVIRONMENT: 'production',
  
  // App Settings
  APP_NAME: 'Sarya Connective',
  APP_VERSION: '1.0.0',
  
  // Electron Window Settings
  WINDOW: {
    width: 350,
    height: 600,
    maxWidth: 400,
    maxHeight: 1000,
    minWidth: 350,
    minHeight: 350,
    backgroundColor: '#1e1e2e'
  }
};

export default PRODUCTION_CONFIG;
