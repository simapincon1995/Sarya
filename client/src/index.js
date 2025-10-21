import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';
import App from './App';
import WidgetApp from './WidgetApp';
import './index.css';

// Check if we're building the widget version
const isWidgetBuild = process.env.REACT_APP_ENTRY_POINT === 'widget';

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

if (isWidgetBuild) {
  // Load the attendance widget
  root.render(
    <React.StrictMode>
      <PrimeReactProvider value={value}>
        <WidgetApp />
      </PrimeReactProvider>
    </React.StrictMode>
  );
} else {
  // Load the full HRMS application
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
