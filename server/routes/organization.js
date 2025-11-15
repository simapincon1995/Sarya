const express = require('express');
const Organization = require('../models/Organization');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get organization settings (public - for timezone only)
router.get('/settings/public', async (req, res) => {
  try {
    const settings = await Organization.getSettings();
    // Return only timezone and date/time formats (safe public info)
    res.json({ 
      timezone: settings.timezone || 'America/New_York',
      dateFormat: settings.dateFormat || 'MM/DD/YYYY',
      timeFormat: settings.timeFormat || 'hh:mm A'
    });
  } catch (error) {
    console.error('Get public organization settings error:', error);
    // Return defaults if error
    res.json({ 
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: 'hh:mm A'
    });
  }
});

// Get organization settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await Organization.getSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Get organization settings error:', error);
    res.status(500).json({ message: 'Failed to fetch organization settings', error: error.message });
  }
});

// Update organization settings (Admin and HR Admin only)
router.put('/settings', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { settings } = req.body;
    const updatedBy = req.user._id;

    const organization = await Organization.updateSettings(settings, updatedBy);

    res.json({
      message: 'Organization settings updated successfully',
      settings: organization.settings
    });
  } catch (error) {
    console.error('Update organization settings error:', error);
    res.status(500).json({ message: 'Failed to update organization settings', error: error.message });
  }
});

// Update work start time (Admin and HR Admin only)
router.put('/work-start-time', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { workStartTime } = req.body;
    const updatedBy = req.user._id;

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(workStartTime)) {
      return res.status(400).json({ message: 'Invalid time format. Please use HH:mm format (e.g., 09:00)' });
    }

    // Get current settings
    const currentSettings = await Organization.getSettings();
    
    // Update only the work start time
    const updatedSettings = {
      ...currentSettings,
      workingHours: {
        ...currentSettings.workingHours,
        start: workStartTime
      }
    };

    const organization = await Organization.updateSettings(updatedSettings, updatedBy);

    res.json({
      message: 'Work start time updated successfully',
      workStartTime: organization.settings.workingHours.start,
      settings: organization.settings
    });
  } catch (error) {
    console.error('Update work start time error:', error);
    res.status(500).json({ message: 'Failed to update work start time', error: error.message });
  }
});

// Get organization information
router.get('/', authenticateToken, async (req, res) => {
  try {
    const organization = await Organization.findOne({ isActive: true })
      .populate('createdBy', 'firstName lastName employeeId');

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({ organization });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ message: 'Failed to fetch organization', error: error.message });
  }
});

// Create organization (Admin, HR Admin)
router.post('/', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      settings,
      contact,
      logo
    } = req.body;

    const createdBy = req.user._id;

    // Check if organization already exists
    const existingOrg = await Organization.findOne({ code });
    if (existingOrg) {
      return res.status(400).json({ message: 'Organization with this code already exists' });
    }

    const organization = new Organization({
      name,
      code,
      description,
      settings,
      contact,
      logo,
      createdBy
    });

    await organization.save();

    res.status(201).json({
      message: 'Organization created successfully',
      organization: {
        id: organization._id,
        name: organization.name,
        code: organization.code,
        description: organization.description
      }
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ message: 'Failed to create organization', error: error.message });
  }
});

// Update organization (Admin, HR Admin)
router.put('/:organizationId', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const {
      name,
      description,
      settings,
      contact,
      logo,
      isActive
    } = req.body;

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Update fields
    if (name) organization.name = name;
    if (description) organization.description = description;
    if (settings) organization.settings = { ...organization.settings, ...settings };
    if (contact) organization.contact = { ...organization.contact, ...contact };
    if (logo !== undefined) organization.logo = logo;
    if (isActive !== undefined) organization.isActive = isActive;

    await organization.save();

    res.json({
      message: 'Organization updated successfully',
      organization: {
        id: organization._id,
        name: organization.name,
        code: organization.code,
        description: organization.description,
        isActive: organization.isActive
      }
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ message: 'Failed to update organization', error: error.message });
  }
});

module.exports = router;
