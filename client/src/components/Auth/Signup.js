import React, { useState, useRef } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    designation: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { signup, isAuthenticated } = useAuth();
  const toast = useRef(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else if (!formData.email.toLowerCase().endsWith('@hrms.com')) {
      newErrors.email = 'Only @hrms.com email addresses are allowed for admin signup';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    
    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const signupData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.toLowerCase(),
        password: formData.password,
        department: formData.department.trim(),
        designation: formData.designation.trim(),
        phone: formData.phone.trim()
      };

      const result = await signup(signupData);
      if (result.success) {
        toast.current.show({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Admin account created successfully!', 
          life: 3000 
        });
        navigate('/dashboard', { replace: true });
      } else {
        toast.current.show({ 
          severity: 'error', 
          summary: 'Error', 
          detail: result.message || 'Signup failed', 
          life: 5000 
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An unexpected error occurred';
      toast.current.show({ 
        severity: 'error', 
        summary: 'Error', 
        detail: errorMessage, 
        life: 5000 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return isAuthenticated ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <div className="login-wrapper">
      <Toast ref={toast} />

      {/* Left section - Admin Benefits */}
      <div className="login-left-panel">
        <div className="brand-logo">
          <img src="/assets/logo.jfif" alt="SaryaHR" className="logo-image" />
          <span className="logo-text">SaryaHR</span>
        </div>

        <div className="process-steps">
          <div className="step">
            <div className="step-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="step-content">
              <h3>Admin Control</h3>
              <p>Full access to employee management, attendance tracking, and system configuration</p>
            </div>
          </div>

          <div className="step">
            <div className="step-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="step-content">
              <h3>User Management</h3>
              <p>Create and manage employee accounts, assign roles, and control system access</p>
            </div>
          </div>

          <div className="step">
            <div className="step-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
            </div>
            <div className="step-content">
              <h3>Secure Access</h3>
              <p>Restricted to @hrms.com domain for enhanced security and authorized access only</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right section - Signup Form */}
      <div className="login-right-panel">
        <div className="form-container">
          <h2 className="welcome-text">Create Admin Account</h2>
          <p className="sub-text">Sign up with your @hrms.com email to get started with SaryaHR.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="input-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {errors.firstName && <small className="error">{errors.firstName}</small>}
              </div>

              <div className="input-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {errors.lastName && <small className="error">{errors.lastName}</small>}
              </div>
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="admin@hrms.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {errors.email && <small className="error">{errors.email}</small>}
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {errors.password && <small className="error">{errors.password}</small>}
              </div>

              <div className="input-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {errors.confirmPassword && <small className="error">{errors.confirmPassword}</small>}
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  placeholder="IT Department"
                  value={formData.department}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {errors.department && <small className="error">{errors.department}</small>}
              </div>

              <div className="input-group">
                <label>Designation</label>
                <input
                  type="text"
                  name="designation"
                  placeholder="System Administrator"
                  value={formData.designation}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {errors.designation && <small className="error">{errors.designation}</small>}
              </div>
            </div>

            <div className="input-group">
              <label>Phone Number (Optional)</label>
              <input
                type="tel"
                name="phone"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Admin Account'}
            </button>

            <div className="form-footer">
              <div className="divider">or</div>
              <p className="signup-text">
                Already have an account? <Link to="/login" className="signup-link">Sign in here</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
