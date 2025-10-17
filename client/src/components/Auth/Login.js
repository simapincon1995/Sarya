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
        // Auto Check-In on successful login (best-effort; ignore errors such as already checked in)
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

      {/* Left section - Form */}
      <div className="login-left-panel">
        <h1 className="brand-logo">
         ShrinQ Connect
        </h1>

        <div className="form-section">
          <h2 className="welcome-text">Welcome back</h2>
          <p className="sub-text">Please enter your details</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
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
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {errors.password && <small className="error">{errors.password}</small>}
            </div>

            <div className="options-row">

              <button type="button" className="link-btn">
                Forgot password
              </button>
            </div>

            <button type="submit" className="primary-btn" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

         </form>
        </div>
      </div>

      {/* Right section - Illustration */}
      <div className="login-right-panel">
       
      </div>
    </div>
  );
};

export default Login;
