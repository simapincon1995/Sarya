import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';
import App from './App';
import WidgetApp from './WidgetApp';
import './index.css';

// Check if running in Electron
// Check both user agent and electronAPI (which is injected by preload script)
const isElectron = typeof window !== 'undefined' && 
  (window.navigator.userAgent.indexOf('Electron') !== -1 || 
   typeof window.electronAPI !== 'undefined');

// PrimeReact configuration
const value = {
  ripple: true,
  inputStyle: 'outlined',
  zIndex: {
    modal: 1100,
    overlay: 1000,
    menu: 1000,
    tooltip: 1100
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));

if (isElectron) {
  // Load the attendance widget in Electron
  root.render(
    <React.StrictMode>
      <PrimeReactProvider value={value}>
        <WidgetApp />
      </PrimeReactProvider>
    </React.StrictMode>
  );
} else {
  // Load the full HRMS application in browser
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <PrimeReactProvider value={value}>
          <App />
        </PrimeReactProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}
