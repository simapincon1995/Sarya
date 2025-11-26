const express = require('express');
const User = require('../models/User');
const Template = require('../models/Template');
const { authenticateToken, authorize, canAccessEmployee } = require('../middleware/auth');
const { 
  formatCurrency, 
  formatDate, 
  calculateProbationEnd,
  calculateExperience,
  generateDocumentNumber
} = require('../utils/documentUtils');

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

// Generate offer letter for candidate
router.post('/generate-offer', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const {
      candidateName,
      designation,
      department,
      reportingManager,
      joiningDate,
      salary,
      location,
      probationPeriod = 3
    } = req.body;

    if (!candidateName || !designation || !department || !joiningDate || !salary) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get offer letter template
    let template = await Template.findOne({ type: 'offer_letter', isDefault: true });
    
    // If no template exists, create default templates
    if (!template) {
      console.log('⚠️  Offer letter template not found. Creating default templates...');
      try {
        await Template.createDefaultTemplates();
        template = await Template.findOne({ type: 'offer_letter', isDefault: true });
        console.log('✅ Default templates created successfully');
      } catch (createError) {
        console.error('❌ Failed to create default templates:', createError);
        return res.status(500).json({ 
          message: 'Offer letter template not found and could not be created automatically',
          error: createError.message 
        });
      }
    }
    
    if (!template) {
      return res.status(404).json({ 
        message: 'Offer letter template not found. Please contact administrator.',
        hint: 'Run: node init-templates.js'
      });
    }

    const probationEndDate = calculateProbationEnd(joiningDate, probationPeriod);
    const acceptanceDeadline = new Date();
    acceptanceDeadline.setDate(acceptanceDeadline.getDate() + 7);

    // Prepare template data
    const templateData = {
      companyName: 'Sarya Connective',
      companyAddress: 'Your Company Address',
      offerDate: formatDate(new Date(), 'DD MMMM YYYY'),
      candidateName,
      designation,
      department,
      reportingManager: reportingManager || 'To be assigned',
      joiningDate: formatDate(joiningDate, 'DD MMMM YYYY'),
      ctc: formatCurrency(salary * 12),
      location: location || 'Office Location',
      probationPeriod: probationPeriod.toString(),
      acceptanceDeadline: formatDate(acceptanceDeadline, 'DD MMMM YYYY'),
      hrName: req.user.fullName
    };

    // Render offer letter
    const renderedContent = template.render(templateData);

    res.json({
      message: 'Offer letter generated successfully',
      document: {
        type: 'offer_letter',
        content: renderedContent,
        candidateName,
        designation
      }
    });
  } catch (error) {
    console.error('Generate offer letter error:', error);
    res.status(500).json({ message: 'Failed to generate offer letter', error: error.message });
  }
});

// Generate appointment letter for new employee
router.post('/:employeeId/generate-appointment', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await User.findById(employeeId)
      .populate('manager', 'firstName lastName');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get appointment letter template
    let template = await Template.findOne({ type: 'appointment_letter', isDefault: true });
    
    // If no template exists, create default templates
    if (!template) {
      console.log('⚠️  Appointment letter template not found. Creating default templates...');
      try {
        await Template.createDefaultTemplates();
        template = await Template.findOne({ type: 'appointment_letter', isDefault: true });
        console.log('✅ Default templates created successfully');
      } catch (createError) {
        console.error('❌ Failed to create default templates:', createError);
        return res.status(500).json({ 
          message: 'Appointment letter template not found and could not be created automatically',
          error: createError.message 
        });
      }
    }
    
    if (!template) {
      return res.status(404).json({ 
        message: 'Appointment letter template not found. Please run template initialization.',
        hint: 'Contact administrator to run: node init-templates.js'
      });
    }

    const probationEndDate = calculateProbationEnd(employee.joiningDate || new Date(), 3);

    // Prepare template data
    const templateData = {
      companyName: 'Sarya Connective',
      appointmentDate: formatDate(new Date(), 'DD MMMM YYYY'),
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      designation: employee.designation || 'Employee',
      department: employee.department || 'General',
      reportingManager: employee.manager ? employee.manager.fullName : 'HR Manager',
      joiningDate: formatDate(employee.joiningDate || new Date(), 'DD MMMM YYYY'),
      workLocation: employee.location || 'Office',
      monthlySalary: formatCurrency(employee.salary || 0),
      probationPeriod: '3',
      probationEndDate: formatDate(probationEndDate, 'DD MMMM YYYY'),
      hrName: req.user.fullName
    };

    // Render appointment letter
    const renderedContent = template.render(templateData);

    res.json({
      message: 'Appointment letter generated successfully',
      document: {
        type: 'appointment_letter',
        content: renderedContent,
        employee: {
          id: employee._id,
          name: employee.fullName,
          employeeId: employee.employeeId
        }
      }
    });
  } catch (error) {
    console.error('Generate appointment letter error:', error);
    res.status(500).json({ message: 'Failed to generate appointment letter', error: error.message });
  }
});

// Generate experience certificate
router.post('/:employeeId/generate-experience', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { lastWorkingDate } = req.body;

    const employee = await User.findById(employeeId);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get experience certificate template
    let template = await Template.findOne({ type: 'experience_certificate', isDefault: true });
    
    // If no template exists, create default templates
    if (!template) {
      console.log('⚠️  Experience certificate template not found. Creating default templates...');
      try {
        await Template.createDefaultTemplates();
        template = await Template.findOne({ type: 'experience_certificate', isDefault: true });
        console.log('✅ Default templates created successfully');
      } catch (createError) {
        console.error('❌ Failed to create default templates:', createError);
        return res.status(500).json({ 
          message: 'Experience certificate template not found and could not be created automatically',
          error: createError.message 
        });
      }
    }
    
    if (!template) {
      return res.status(404).json({ 
        message: 'Experience certificate template not found. Please contact administrator.',
        hint: 'Run: node init-templates.js'
      });
    }

    const exitDate = lastWorkingDate ? new Date(lastWorkingDate) : new Date();
    const totalExperience = calculateExperience(employee.joiningDate || new Date(), exitDate);

    // Prepare template data
    const templateData = {
      companyName: 'Sarya Connective',
      companyAddress: 'Your Company Address',
      issueDate: formatDate(new Date(), 'DD MMMM YYYY'),
      certificateNumber: generateDocumentNumber('EXP'),
      employeeName: employee.fullName,
      employeeId: employee.employeeId,
      designation: employee.designation || 'Employee',
      department: employee.department || 'General',
      joiningDate: formatDate(employee.joiningDate || new Date(), 'DD MMMM YYYY'),
      lastWorkingDate: formatDate(exitDate, 'DD MMMM YYYY'),
      totalExperience,
      hrName: req.user.fullName
    };

    // Render experience certificate
    const renderedContent = template.render(templateData);

    res.json({
      message: 'Experience certificate generated successfully',
      document: {
        type: 'experience_certificate',
        content: renderedContent,
        employee: {
          id: employee._id,
          name: employee.fullName,
          employeeId: employee.employeeId
        }
      }
    });
  } catch (error) {
    console.error('Generate experience certificate error:', error);
    res.status(500).json({ message: 'Failed to generate experience certificate', error: error.message });
  }
});

// Generate relieving letter
router.post('/:employeeId/generate-relieving', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { lastWorkingDate } = req.body;

    const employee = await User.findById(employeeId);

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get relieving letter template
    let template = await Template.findOne({ type: 'relieving_letter', isDefault: true });
    
    // If no template exists, create default templates
    if (!template) {
      console.log('⚠️  Relieving letter template not found. Creating default templates...');
      try {
        await Template.createDefaultTemplates();
        template = await Template.findOne({ type: 'relieving_letter', isDefault: true });
        console.log('✅ Default templates created successfully');
      } catch (createError) {
        console.error('❌ Failed to create default templates:', createError);
        return res.status(500).json({ 
          message: 'Relieving letter template not found and could not be created automatically',
          error: createError.message 
        });
      }
    }
    
    if (!template) {
      return res.status(404).json({ 
        message: 'Relieving letter template not found. Please contact administrator.',
        hint: 'Run: node init-templates.js'
      });
    }

    const exitDate = lastWorkingDate ? new Date(lastWorkingDate) : new Date();

    // Prepare template data
    const templateData = {
      companyName: 'Sarya Connective',
      companyAddress: 'Your Company Address',
      relievingDate: formatDate(new Date(), 'DD MMMM YYYY'),
      employeeName: employee.fullName,
      employeeId: employee.employeeId,
      designation: employee.designation || 'Employee',
      joiningDate: formatDate(employee.joiningDate || new Date(), 'DD MMMM YYYY'),
      lastWorkingDate: formatDate(exitDate, 'DD MMMM YYYY'),
      hrName: req.user.fullName
    };

    // Render relieving letter
    const renderedContent = template.render(templateData);

    res.json({
      message: 'Relieving letter generated successfully',
      document: {
        type: 'relieving_letter',
        content: renderedContent,
        employee: {
          id: employee._id,
          name: employee.fullName,
          employeeId: employee.employeeId
        }
      }
    });
  } catch (error) {
    console.error('Generate relieving letter error:', error);
    res.status(500).json({ message: 'Failed to generate relieving letter', error: error.message });
  }
});

module.exports = router;
