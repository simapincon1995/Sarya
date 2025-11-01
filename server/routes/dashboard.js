const express = require('express');
const DashboardWidget = require('../models/DashboardWidget');
const User = require('../models/User');
const { authenticateToken, authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Dashboard-specific rate limiter
const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500 // Higher limit for dashboard API calls
});

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
router.get('/public', dashboardLimiter, async (req, res) => {
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
    const { performers, isVisible } = req.body;
    const userId = req.user._id;

    if (!performers || !Array.isArray(performers) || performers.length === 0) {
      return res.status(400).json({ 
        message: 'At least one performer name is required' 
      });
    }

    // Validate that all performers have names
    const validPerformers = performers.filter(performer => performer.name && performer.name.trim());
    if (validPerformers.length === 0) {
      return res.status(400).json({ 
        message: 'At least one valid performer name is required' 
      });
    }

    // Check if performer of day widget already exists
    let widget = await DashboardWidget.findOne({ name: 'performer-of-day' });

    const performerData = {
      performers: validPerformers,
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
        title: 'Performers of the Day',
        description: 'Today\'s top performing employees',
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
      message: 'Performers of the day updated successfully',
      widget
    });
  } catch (error) {
    console.error('Create/update performer of day error:', error);
    res.status(500).json({ message: 'Failed to update performers of the day', error: error.message });
  }
});

// Get "Performer of the Day" widget
router.get('/performer-of-day', dashboardLimiter, async (req, res) => {
  try {
    const widget = await DashboardWidget.findOne({ 
      name: 'performer-of-day',
      isVisible: true,
      isPublic: true
    });

    console.log('Found widget:', widget); // Debug log

    if (!widget) {
      console.log('No widget found'); // Debug log
      return res.json({ 
        message: 'No performers of the day set',
        widget: null 
      });
    }

    // Check if widget has actual performer data
    if (!widget.performerData || !widget.performerData.performers || widget.performerData.performers.length === 0) {
      console.log('No valid performer data:', widget.performerData); // Debug log
      return res.json({ 
        message: 'No performers of the day data available',
        widget: null 
      });
    }

    console.log('Returning widget with performers:', widget.performerData.performers); // Debug log
    res.json({ widget });
  } catch (error) {
    console.error('Get performer of day error:', error);
    res.status(500).json({ message: 'Failed to fetch performers of the day', error: error.message });
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

// Get Teams Management widget (for admin)
router.get('/teams', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    let widget = await DashboardWidget.findOne({ name: 'teams-management' });

    if (!widget) {
      // Create initial widget if it doesn't exist
      widget = new DashboardWidget({
        name: 'teams-management',
        type: 'team-data',
        title: 'Teams Management',
        description: 'Manage teams and their performance metrics',
        teams: [],
        teamData: {
          date: new Date().toISOString().split('T')[0],
          updatedBy: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
          updatedAt: new Date().toISOString()
        },
        isVisible: true,
        isPublic: true,
        createdBy: req.user._id
      });
      await widget.save();
    }

    await widget.populate('createdBy', 'firstName lastName email');

    res.json({ widget });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: 'Failed to fetch teams', error: error.message });
  }
});

// Get Teams Data widget (for public dashboard)
router.get('/teams/public', dashboardLimiter, async (req, res) => {
  try {
    const widget = await DashboardWidget.findOne({ 
      name: 'teams-management',
      isVisible: true,
      isPublic: true
    });

    if (!widget || !widget.teams || widget.teams.length === 0) {
      return res.json({ 
        message: 'No teams data available',
        widget: null 
      });
    }

    // Filter to only visible teams
    const visibleTeams = widget.teams.filter(team => team.isVisible !== false);

    res.json({ 
      widget: {
        ...widget.toObject(),
        teams: visibleTeams
      }
    });
  } catch (error) {
    console.error('Get public teams error:', error);
    res.status(500).json({ message: 'Failed to fetch teams data', error: error.message });
  }
});

// Create or update Teams (add/update/delete teams)
router.post('/teams', authenticateToken, authorize('admin', 'hr_admin', 'manager'), async (req, res) => {
  try {
    const { teams, isVisible } = req.body;
    const userId = req.user._id;

    if (!teams || !Array.isArray(teams)) {
      return res.status(400).json({ 
        message: 'Teams array is required' 
      });
    }

    // Check if teams widget already exists
    let widget = await DashboardWidget.findOne({ name: 'teams-management' });

    // Generate teamIds for new teams
    const teamsWithIds = teams.map(team => {
      if (!team.teamId) {
        team.teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Ensure fieldVisibility exists with defaults
      if (!team.fieldVisibility) {
        team.fieldVisibility = {
          performers: true,
          expectedCalls: true,
          actualCalls: true,
          expectedCandidates: true,
          actualCandidates: true,
          expectedCallDuration: true,
          actualCallDuration: true,
          expectedJobApplications: true,
          actualJobApplications: true
        };
      }

      // Ensure all numeric fields have defaults
      return {
        teamId: team.teamId,
        name: team.name || 'Unnamed Team',
        performers: team.performers || [],
        expectedCalls: team.expectedCalls || 0,
        actualCalls: team.actualCalls || 0,
        expectedCandidates: team.expectedCandidates || 0,
        actualCandidates: team.actualCandidates || 0,
        expectedCallDuration: team.expectedCallDuration || 0,
        actualCallDuration: team.actualCallDuration || 0,
        expectedJobApplications: team.expectedJobApplications || 0,
        actualJobApplications: team.actualJobApplications || 0,
        fieldVisibility: team.fieldVisibility,
        isVisible: team.isVisible !== undefined ? team.isVisible : true
      };
    });

    const teamData = {
      date: new Date().toISOString().split('T')[0],
      updatedBy: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
      updatedAt: new Date().toISOString()
    };

    if (widget) {
      // Update existing widget
      widget.teams = teamsWithIds;
      widget.teamData = teamData;
      widget.isVisible = isVisible !== undefined ? isVisible : true;
      widget.isPublic = true; // Always public for live dashboard
      widget.lastUpdated = new Date();
      await widget.save();
    } else {
      // Create new widget
      widget = new DashboardWidget({
        name: 'teams-management',
        type: 'team-data',
        title: 'Teams Management',
        description: 'Manage teams and their performance metrics',
        teams: teamsWithIds,
        teamData: teamData,
        isVisible: isVisible !== undefined ? isVisible : true,
        isPublic: true,
        createdBy: userId,
        lastUpdated: new Date()
      });
      await widget.save();
    }

    await widget.populate('createdBy', 'firstName lastName email');

    res.json({
      message: 'Teams updated successfully',
      widget
    });
  } catch (error) {
    console.error('Create/update teams error:', error);
    res.status(500).json({ message: 'Failed to update teams', error: error.message });
  }
});

// Legacy endpoint for backward compatibility - Get Team Data widget
router.get('/team-data', dashboardLimiter, async (req, res) => {
  try {
    const widget = await DashboardWidget.findOne({ 
      name: 'teams-management',
      isVisible: true,
      isPublic: true
    });

    if (!widget) {
      return res.json({ 
        message: 'No team data set',
        widget: null 
      });
    }

    res.json({ widget });
  } catch (error) {
    console.error('Get team data error:', error);
    res.status(500).json({ message: 'Failed to fetch team data', error: error.message });
  }
});

module.exports = router;