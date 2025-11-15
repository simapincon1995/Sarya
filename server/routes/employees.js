const express = require('express');
const User = require('../models/User');
const { authenticateToken, authorize, canAccessEmployee } = require('../middleware/auth');

const router = express.Router();

// Get all employees (Admin, HR Admin, Manager)
router.get('/', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const { page = 1, limit = 10, department, role, search } = req.query;
    const user = req.user;

    let query = { isActive: true };

    // Manager can only see their team members
    if (user.role === 'manager') {
      query._id = { $in: user.teamMembers };
    }

    // Filter by department
    if (department) {
      query.department = department;
    }

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await User.find(query)
      .select('-password -refreshTokens')
      .populate('manager', 'firstName lastName employeeId')
      .populate('teamMembers', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      employees,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Failed to fetch employees', error: error.message });
  }
});

// Get employee by ID
router.get('/:employeeId', authenticateToken, canAccessEmployee, async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await User.findById(employeeId)
      .select('-password -refreshTokens')
      .populate('manager', 'firstName lastName employeeId department')
      .populate('teamMembers', 'firstName lastName employeeId department designation');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Failed to fetch employee', error: error.message });
  }
});

// Create new employee (Admin, HR Admin)
router.post('/', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      password,
      role,
      department,
      designation,
      manager,
      phone,
      address,
      dateOfBirth,
      salary,
      shift
    } = req.body;

    // Check if employee ID or email already exists
    const existingEmployee = await User.findOne({
      $or: [{ employeeId }, { email }]
    });

    if (existingEmployee) {
      return res.status(400).json({
        message: 'Employee with this ID or email already exists'
      });
    }

    const employee = new User({
      employeeId,
      firstName,
      lastName,
      email,
      password: password || 'defaultPassword123', // Default password
      role: role || 'employee',
      department,
      designation,
      manager,
      phone,
      address,
      dateOfBirth,
      salary,
      shift
    });

    await employee.save();

    // If employee has a manager, add to manager's team
    if (manager) {
      await User.findByIdAndUpdate(manager, {
        $addToSet: { teamMembers: employee._id }
      });
    }

    res.status(201).json({
      message: 'Employee created successfully',
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        designation: employee.designation
      }
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Failed to create employee', error: error.message });
  }
});

// Update employee (Admin, HR Admin, Manager for their team)
router.put('/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const user = req.user;

    // Check permissions
    if (user.role === 'manager') {
      if (!user.teamMembers.includes(employeeId)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (!['admin', 'hr_admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      firstName,
      lastName,
      email,
      role,
      department,
      designation,
      manager,
      phone,
      address,
      dateOfBirth,
      salary,
      shift,
      isActive,
      password
    } = req.body;

    const employee = await User.findById(employeeId);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // HR Admin cannot edit/update admin users
    if (user.role === 'hr_admin' && employee.role === 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. HR Admin cannot edit admin user details.' 
      });
    }

    // Update fields
    if (firstName) employee.firstName = firstName;
    if (lastName) employee.lastName = lastName;
    if (email) employee.email = email;
    // Only admin can change roles, HR Admin cannot change admin role
    if (role) {
      if (user.role === 'admin') {
        employee.role = role;
      } else if (user.role === 'hr_admin' && employee.role !== 'admin') {
        // HR Admin can change roles but not for admin users (already checked above)
        employee.role = role;
      }
    }
    if (department) employee.department = department;
    if (designation) employee.designation = designation;
    if (phone) employee.phone = phone;
    if (address) employee.address = address;
    if (dateOfBirth) employee.dateOfBirth = dateOfBirth;
    if (salary && ['admin', 'hr_admin'].includes(user.role)) employee.salary = salary;
    if (shift) employee.shift = shift;
    if (isActive !== undefined && ['admin', 'hr_admin'].includes(user.role)) {
      employee.isActive = isActive;
    }

    // Only admin or hr_admin can change another user's password
    if (password && ['admin', 'hr_admin'].includes(user.role)) {
      employee.password = password; // will be hashed by pre('save') hook
    }

    // Handle manager change
    if (manager !== undefined && ['admin', 'hr_admin'].includes(user.role)) {
      const oldManager = employee.manager;
      employee.manager = manager;

      // Remove from old manager's team
      if (oldManager) {
        await User.findByIdAndUpdate(oldManager, {
          $pull: { teamMembers: employeeId }
        });
      }

      // Add to new manager's team
      if (manager) {
        await User.findByIdAndUpdate(manager, {
          $addToSet: { teamMembers: employeeId }
        });
      }
    }

    await employee.save();

    res.json({
      message: 'Employee updated successfully',
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
        isActive: employee.isActive
      }
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Failed to update employee', error: error.message });
  }
});

// Delete employee (Admin, HR Admin)
router.delete('/:employeeId', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const user = req.user;

    const employee = await User.findById(employeeId);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // HR Admin cannot delete admin users
    if (user.role === 'hr_admin' && employee.role === 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. HR Admin cannot delete admin users.' 
      });
    }

    // Soft delete - deactivate instead of hard delete
    employee.isActive = false;
    await employee.save();

    res.json({ message: 'Employee deactivated successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Failed to delete employee', error: error.message });
  }
});

// Get team members (Manager)
router.get('/:employeeId/team', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const user = req.user;

    // Check if user can access this employee's team
    if (user.role === 'manager' && user._id.toString() !== employeeId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const employee = await User.findById(employeeId)
      .populate('teamMembers', 'firstName lastName employeeId department designation email phone');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ teamMembers: employee.teamMembers });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ message: 'Failed to fetch team members', error: error.message });
  }
});

// Get departments
router.get('/meta/departments', authenticateToken, async (req, res) => {
  try {
    const departments = await User.distinct('department', { isActive: true });
    res.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Failed to fetch departments', error: error.message });
  }
});

// Get managers
router.get('/meta/managers', authenticateToken, async (req, res) => {
  try {
    const managers = await User.find({
      role: { $in: ['admin', 'hr_admin', 'manager'] },
      isActive: true
    }).select('firstName lastName employeeId department');

    res.json({ managers });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ message: 'Failed to fetch managers', error: error.message });
  }
});

module.exports = router;
