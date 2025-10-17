const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(500).json({ message: 'Token verification failed' });
  }
};

// Check user role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

// Check if user can access employee data
const canAccessEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const user = req.user;

    // Admin and HR can access all employees
    if (['admin', 'hr_admin'].includes(user.role)) {
      return next();
    }

    // Manager can access their team members
    if (user.role === 'manager') {
      const employee = await User.findById(employeeId);
      if (employee && user.teamMembers.includes(employeeId)) {
        return next();
      }
    }

    // Employee can only access their own data
    if (user.role === 'employee' && user._id.toString() === employeeId) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Access denied. You can only access your own data.' 
    });
  } catch (error) {
    return res.status(500).json({ message: 'Authorization check failed' });
  }
};

// Check if user can manage team
const canManageTeam = (req, res, next) => {
  const user = req.user;

  if (['admin', 'hr_admin', 'manager'].includes(user.role)) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Access denied. Manager role required.' 
  });
};

// Check if user can access payroll
const canAccessPayroll = (req, res, next) => {
  const user = req.user;

  if (['admin', 'hr_admin'].includes(user.role)) {
    return next();
  }

  // Employee can view their own payroll
  if (user.role === 'employee' && req.params.employeeId === user._id.toString()) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Access denied. HR Admin role required for payroll management.' 
  });
};

// Check if user can access templates
const canAccessTemplates = (req, res, next) => {
  const user = req.user;

  if (['admin', 'hr_admin'].includes(user.role)) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Access denied. HR Admin role required for template management.' 
  });
};

// Check if user can access dashboard
const canAccessDashboard = (req, res, next) => {
  const user = req.user;

  // All authenticated users can access dashboard
  if (user) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Access denied. Authentication required.' 
  });
};

module.exports = {
  authenticateToken,
  authorize,
  canAccessEmployee,
  canManageTeam,
  canAccessPayroll,
  canAccessTemplates,
  canAccessDashboard
};
