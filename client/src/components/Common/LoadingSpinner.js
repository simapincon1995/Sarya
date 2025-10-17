import React from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';

const LoadingSpinner = ({ size = 'normal', message = 'Loading...' }) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return '20px';
      case 'large':
        return '60px';
      default:
        return '40px';
    }
  };

  return (
    <div className="loading-container">
      <div className="flex flex-column align-items-center gap-3">
        <ProgressSpinner 
          style={{ width: getSize(), height: getSize() }} 
          strokeWidth="4"
        />
        {message && (
          <p className="text-color-secondary text-sm">{message}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
