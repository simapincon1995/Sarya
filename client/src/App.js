import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocalizationProvider } from './contexts/LocalizationContext';
import { SocketProvider } from './contexts/SocketContext';

// Components
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import WidgetApp from './WidgetApp';

// Pages
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import AttendanceHistory from './pages/AttendanceHistory';
import Leaves from './pages/Leaves';
import Payroll from './pages/Payroll';
import Templates from './pages/Templates';
import Holidays from './pages/Holidays';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import LiveDashboard from './pages/LiveDashboard';
import PublicLiveDashboard from './components/PublicLiveDashboard';
import DashboardWidgetManagement from './pages/DashboardWidgetManagement';

function App() {
  const toast = useRef(null);

  // PrimeReact configuration
  const primeReactConfig = {
    ripple: true,
    inputStyle: 'outlined',
    zIndex: {
      modal: 1100,
      overlay: 1000,
      menu: 1000,
      tooltip: 1100
    }
  };

  return (
    <PrimeReactProvider value={primeReactConfig}>
      <ThemeProvider>
        <LocalizationProvider>
          <AuthProvider>
            <SocketProvider>
              <div className="app-container">
                <Toast ref={toast} />
                
                <Routes>
                {/* Public Routes */}
                <Route 
                  path="/login" 
                  element={<Login />} 
                />
                
                {/* <Route 
                  path="/signup" 
                  element={<Signup />} 
                /> */}
                
                {/* Public Live Dashboard Route */}
                <Route 
                  path="/live-dashboard" 
                  element={<PublicLiveDashboard />} 
                />
                
                {/* Widget Route for Development */}
                <Route 
                  path="/widget" 
                  element={<WidgetApp />} 
                />
                
                {/* Protected Routes */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="employees" element={<Employees />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="attendance-history" element={<AttendanceHistory />} />
                  <Route path="leaves" element={<Leaves />} />
                  <Route path="payroll" element={<Payroll />} />
                  <Route path="templates" element={<Templates />} />
                  <Route path="holidays" element={<Holidays />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="live-dashboard" element={<LiveDashboard />} />
                  <Route path="dashboard-widgets" element={<DashboardWidgetManagement />} />
                </Route>
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </SocketProvider>
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </PrimeReactProvider>
  );
}

export default App;
