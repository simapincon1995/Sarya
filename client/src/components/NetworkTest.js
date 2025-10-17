import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';

const NetworkTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const toast = React.useRef(null);

  const testConnection = async () => {
    setIsLoading(true);
    setResults([]);
    
    // Test 1: Basic server connection
    try {
      const response = await fetch('http://localhost:5000/api/test');
      const data = await response.json();
      setResults(prev => [...prev, { test: 'Server Connection', status: 'SUCCESS', message: data.message }]);
    } catch (error) {
      setResults(prev => [...prev, { test: 'Server Connection', status: 'FAILED', message: error.message }]);
    }

    // Test 2: Check-in endpoint (without auth)
    try {
      const response = await fetch('http://localhost:5000/api/test-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: { latitude: 0, longitude: 0, address: 'Office' },
          ipAddress: '127.0.0.1',
          deviceInfo: 'Web Browser'
        })
      });
      const data = await response.json();
      setResults(prev => [...prev, { test: 'Check-in Endpoint', status: 'SUCCESS', message: data.message }]);
    } catch (error) {
      setResults(prev => [...prev, { test: 'Check-in Endpoint', status: 'FAILED', message: error.message }]);
    }

    // Test 3: Check authentication token
    const token = localStorage.getItem('token');
    if (token) {
      setResults(prev => [...prev, { test: 'Auth Token', status: 'SUCCESS', message: 'Token found in localStorage' }]);
      
      // Test 4: Authenticated request
      try {
        const response = await fetch('http://localhost:5000/api/attendance/today', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          setResults(prev => [...prev, { test: 'Authenticated Request', status: 'SUCCESS', message: 'Auth working' }]);
        } else {
          const errorData = await response.json();
          setResults(prev => [...prev, { test: 'Authenticated Request', status: 'FAILED', message: errorData.message }]);
        }
      } catch (error) {
        setResults(prev => [...prev, { test: 'Authenticated Request', status: 'FAILED', message: error.message }]);
      }
    } else {
      setResults(prev => [...prev, { test: 'Auth Token', status: 'FAILED', message: 'No token found' }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="grid">
      <Toast ref={toast} />
      <div className="col-12">
        <Card title="Network & API Connection Test">
          <div className="mb-4">
            <Button 
              label="Run Tests" 
              icon="pi pi-play" 
              onClick={testConnection}
              loading={isLoading}
            />
          </div>
          
          {results.length > 0 && (
            <div className="grid">
              {results.map((result, index) => (
                <div key={index} className="col-12">
                  <div className={`border-1 border-round p-3 ${result.status === 'SUCCESS' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                    <div className="flex justify-content-between align-items-center">
                      <span className="font-medium">{result.test}</span>
                      <span className={`text-sm ${result.status === 'SUCCESS' ? 'text-green-700' : 'text-red-700'}`}>
                        {result.status}
                      </span>
                    </div>
                    <div className="text-sm mt-2">{result.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default NetworkTest;