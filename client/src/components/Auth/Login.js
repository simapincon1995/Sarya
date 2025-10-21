import React, { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const toast = useRef(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        toast.current.show({ severity: 'success', summary: 'Success', detail: 'Login successful', life: 1500 });
        // Check if we're in widget mode
        const isWidgetMode = localStorage.getItem('WIDGET_MODE') === 'true' || 
                            new URLSearchParams(window.location.search).get('widget') === 'true' ||
                            process.env.REACT_APP_ENTRY_POINT === 'widget';
        
        if (isWidgetMode) {
          // Auto Check-In on successful login in widget mode (best-effort; ignore errors such as already checked in)
          try {
            await attendanceService.checkIn(
              { latitude: 0, longitude: 0, address: 'Office' },
              '127.0.0.1',
              'Electron/Desktop'
            );
          } catch (e) {
            // ignore check-in errors (e.g., already checked in, holiday)
          }
          navigate('/attendance', { replace: true });
        } else {
          // Regular browser login - go to dashboard
          navigate('/dashboard', { replace: true });
        }
      } else {
        toast.current.show({ severity: 'error', summary: 'Error', detail: result.message || 'Login failed', life: 5000 });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Unexpected error', life: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  return isAuthenticated ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <div className="login-wrapper">
      <Toast ref={toast} />

      {/* Left section - Process Steps */}
      <div className="login-left-panel">
        <div className="brand-logo">
          <img src="/assets/logo.jfif" alt="SaryaHR" className="logo-image" />
          <span className="logo-text">Sarya</span>
        </div>

        <div className="process-steps">
          <div className="step">
            <div className="step-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="step-content">
              <h3>Employee Onboarding</h3>
              <p>Complete your profile setup and get access to company resources</p>
            </div>
          </div>

          <div className="step">
            <div className="step-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="step-content">
              <h3>Time & Attendance</h3>
              <p>Track your work hours, manage attendance, and submit timesheets</p>
            </div>
          </div>

          <div className="step">
            <div className="step-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                <rect x="9" y="11" width="6" height="11"/>
                <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
              </svg>
            </div>
            <div className="step-content">
              <h3>HR Management</h3>
              <p>Access payroll, leave management, and employee self-service portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right section - Login Form */}
      <div className="login-right-panel">
        <div className="form-container">
          <h2 className="welcome-text">Welcome Back!</h2>
          <p className="sub-text">Fill in your credentials below to access your SaryaHR account.</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {errors.email && <small className="error">{errors.email}</small>}
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Your password..."
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {errors.password && <small className="error">{errors.password}</small>}
            </div>

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Login'}
            </button>

            <div className="form-footer">
              <a href="/forgot-password" className="help-link">Having trouble logging in?</a>
              <div className="divider">or</div>
              <p className="signup-text">
                Don't have an account yet? <a href="/register" className="signup-link">Create admin account</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
