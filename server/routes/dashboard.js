const express = require('express');
const DashboardWidget = require('../models/DashboardWidget');
const User = require('../models/User');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all dashboard widgets (for management)
router.get('/', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const widgets = await DashboardWidget.find({})
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ widgets });
  } catch (error) {
    console.error('Get dashboard widgets error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard widgets', error: error.message });
  }
});

// Get public dashboard widgets (for live dashboard)
router.get('/public', async (req, res) => {
  try {
    const widgets = await DashboardWidget.find({ 
      isVisible: true, 
      isPublic: true 
    }).sort({ createdAt: -1 });
    
    res.json({ widgets });
  } catch (error) {
    console.error('Get public dashboard widgets error:', error);
    res.status(500).json({ message: 'Failed to fetch public dashboard widgets', error: error.message });
  }
});

// Create new dashboard widget
router.post('/', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const { name, type, title, description, data, isVisible, isPublic } = req.body;
    const userId = req.user._id;

    // Check if widget with same name already exists
    const existingWidget = await DashboardWidget.findOne({ name });
    if (existingWidget) {
      return res.status(400).json({ message: 'Widget with this name already exists' });
    }

    const widget = new DashboardWidget({
      name,
      type,
      title,
      description,
      data,
      isVisible: isVisible !== undefined ? isVisible : true,
      isPublic: isPublic !== undefined ? isPublic : false,
      createdBy: userId,
      lastUpdated: new Date()
    });

    await widget.save();
    await widget.populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      message: 'Dashboard widget created successfully',
      widget
    });
  } catch (error) {
    console.error('Create dashboard widget error:', error);
    res.status(500).json({ message: 'Failed to create dashboard widget', error: error.message });
  }
});

// Update dashboard widget
router.put('/:widgetId', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const { widgetId } = req.params;
    const updateData = req.body;
    const userId = req.user._id;

    const widget = await DashboardWidget.findById(widgetId);
    if (!widget) {
      return res.status(404).json({ message: 'Dashboard widget not found' });
    }

    // Check if user can edit this widget
    if (!widget.canUserEdit(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'data', 'isVisible', 'isPublic'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        widget[field] = updateData[field];
      }
    });

    widget.lastUpdated = new Date();
    await widget.save();
    await widget.populate('createdBy', 'firstName lastName email');

    res.json({
      message: 'Dashboard widget updated successfully',
      widget
    });
  } catch (error) {
    console.error('Update dashboard widget error:', error);
    res.status(500).json({ message: 'Failed to update dashboard widget', error: error.message });
  }
});

// Delete dashboard widget
router.delete('/:widgetId', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const { widgetId } = req.params;
    const userId = req.user._id;

    const widget = await DashboardWidget.findById(widgetId);
    if (!widget) {
      return res.status(404).json({ message: 'Dashboard widget not found' });
    }

    // Check if user can edit this widget
    if (!widget.canUserEdit(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await DashboardWidget.findByIdAndDelete(widgetId);

    res.json({ message: 'Dashboard widget deleted successfully' });
  } catch (error) {
    console.error('Delete dashboard widget error:', error);
    res.status(500).json({ message: 'Failed to delete dashboard widget', error: error.message });
  }
});

// Create or update "Performer of the Day" widget
router.post('/performer-of-day', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const { employeeName, department, achievement, reason, isVisible } = req.body;
    const userId = req.user._id;

    if (!employeeName || !department || !achievement) {
      return res.status(400).json({ 
        message: 'Employee name, department, and achievement are required' 
      });
    }

    // Check if performer of day widget already exists
    let widget = await DashboardWidget.findOne({ name: 'performer-of-day' });

    const performerData = {
      employeeName,
      department,
      achievement,
      reason: reason || '',
      date: new Date().toISOString().split('T')[0], // Today's date
      updatedBy: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
      updatedAt: new Date().toISOString()
    };

    if (widget) {
      // Update existing widget - store performer data in a custom field
      widget.performerData = performerData;
      widget.isVisible = isVisible !== undefined ? isVisible : true;
      widget.isPublic = true; // Always public for live dashboard
      widget.lastUpdated = new Date();
      await widget.save();
    } else {
      // Create new widget
      widget = new DashboardWidget({
        name: 'performer-of-day',
        type: 'announcement',
        title: 'Performer of the Day',
        description: 'Today\'s top performing employee',
        performerData: performerData, // Store in custom field
        isVisible: isVisible !== undefined ? isVisible : true,
        isPublic: true,
        createdBy: userId,
        lastUpdated: new Date()
      });
      await widget.save();
    }

    await widget.populate('createdBy', 'firstName lastName email');

    res.json({
      message: 'Performer of the day updated successfully',
      widget
    });
  } catch (error) {
    console.error('Create/update performer of day error:', error);
    res.status(500).json({ message: 'Failed to update performer of the day', error: error.message });
  }
});

// Get "Performer of the Day" widget
router.get('/performer-of-day', async (req, res) => {
  try {
    const widget = await DashboardWidget.findOne({ 
      name: 'performer-of-day',
      isVisible: true,
      isPublic: true
    });

    if (!widget) {
      return res.json({ 
        message: 'No performer of the day set',
        widget: null 
      });
    }

    // Check if widget has actual performer data
    if (!widget.performerData || !widget.performerData.employeeName) {
      return res.json({ 
        message: 'No performer of the day data available',
        widget: null 
      });
    }

    res.json({ widget });
  } catch (error) {
    console.error('Get performer of day error:', error);
    res.status(500).json({ message: 'Failed to fetch performer of the day', error: error.message });
  }
});

// Hide "Performer of the Day" widget
router.put('/performer-of-day/hide', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const widget = await DashboardWidget.findOne({ name: 'performer-of-day' });
    
    if (!widget) {
      return res.status(404).json({ message: 'Performer of the day widget not found' });
    }

    widget.isVisible = false;
    widget.lastUpdated = new Date();
    await widget.save();

    res.json({ message: 'Performer of the day hidden successfully' });
  } catch (error) {
    console.error('Hide performer of day error:', error);
    res.status(500).json({ message: 'Failed to hide performer of the day', error: error.message });
  }
});

module.exports = router;