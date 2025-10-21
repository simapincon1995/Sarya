import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrimeReactProvider } from 'primereact/api';
import WidgetApp from './WidgetApp';
import './index.css';

// PrimeReact configuration for widget
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

// Load the attendance widget
root.render(
  <React.StrictMode>
    <PrimeReactProvider value={value}>
      <WidgetApp />
    </PrimeReactProvider>
  </React.StrictMode>
);