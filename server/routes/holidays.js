const express = require('express');
const Holiday = require('../models/Holiday');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all holidays
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { year, type, isActive, page = 1, limit = 10 } = req.query;

    let query = {};

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      query.date = { $gte: startOfYear, $lte: endOfYear };
    }

    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const holidays = await Holiday.find(query)
      .populate('createdBy', 'firstName lastName employeeId')
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Holiday.countDocuments(query);

    res.json({
      holidays,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ message: 'Failed to fetch holidays', error: error.message });
  }
});

// Get holiday by ID
router.get('/:holidayId', authenticateToken, async (req, res) => {
  try {
    const { holidayId } = req.params;

    const holiday = await Holiday.findById(holidayId)
      .populate('createdBy', 'firstName lastName employeeId');

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json({ holiday });
  } catch (error) {
    console.error('Get holiday error:', error);
    res.status(500).json({ message: 'Failed to fetch holiday', error: error.message });
  }
});

// Create new holiday (Admin, HR Admin)
router.post('/', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const {
      name,
      date,
      type,
      description,
      isRecurring,
      recurringPattern,
      applicableDepartments,
      applicableLocations,
      isPaid,
      workingHours
    } = req.body;

    // Validate required fields
    if (!name || !date || !type) {
      return res.status(400).json({ message: 'Missing required fields: name, date, type' });
    }

    const createdBy = req.user._id;

    // Check if holiday already exists on this date
    const holidayDate = new Date(date);
    const existingHoliday = await Holiday.findOne({ 
      date: {
        $gte: new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate()),
        $lt: new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate() + 1)
      }
    });
    if (existingHoliday) {
      return res.status(400).json({ message: 'Holiday already exists on this date' });
    }

    const holiday = new Holiday({
      name,
      date: holidayDate,
      type,
      description,
      isRecurring,
      recurringPattern,
      applicableDepartments,
      applicableLocations,
      isPaid,
      workingHours,
      createdBy
    });

    await holiday.save();

    res.status(201).json({
      message: 'Holiday created successfully',
      holiday: {
        id: holiday._id,
        name: holiday.name,
        date: holiday.date,
        type: holiday.type,
        isRecurring: holiday.isRecurring
      }
    });
  } catch (error) {
    console.error('Create holiday error:', error);
    res.status(500).json({ message: 'Failed to create holiday', error: error.message });
  }
});

// Update holiday (Admin, HR Admin)
router.put('/:holidayId', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { holidayId } = req.params;
    const {
      name,
      date,
      type,
      description,
      isRecurring,
      recurringPattern,
      applicableDepartments,
      applicableLocations,
      isPaid,
      workingHours,
      isActive
    } = req.body;

    const holiday = await Holiday.findById(holidayId);

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    // Update fields
    if (name !== undefined) holiday.name = name;
    if (date !== undefined) holiday.date = new Date(date);
    if (type !== undefined) holiday.type = type;
    if (description !== undefined) holiday.description = description;
    if (isRecurring !== undefined) holiday.isRecurring = isRecurring;
    if (recurringPattern !== undefined) holiday.recurringPattern = recurringPattern;
    if (applicableDepartments !== undefined) holiday.applicableDepartments = applicableDepartments;
    if (applicableLocations !== undefined) holiday.applicableLocations = applicableLocations;
    if (isPaid !== undefined) holiday.isPaid = isPaid;
    if (workingHours !== undefined) holiday.workingHours = workingHours;
    if (isActive !== undefined) holiday.isActive = isActive;

    await holiday.save();

    res.json({
      message: 'Holiday updated successfully',
      holiday: {
        id: holiday._id,
        name: holiday.name,
        date: holiday.date,
        type: holiday.type,
        isActive: holiday.isActive
      }
    });
  } catch (error) {
    console.error('Update holiday error:', error);
    res.status(500).json({ message: 'Failed to update holiday', error: error.message });
  }
});

// Delete holiday (Admin, HR Admin)
router.delete('/:holidayId', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { holidayId } = req.params;

    const holiday = await Holiday.findById(holidayId);

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    await Holiday.findByIdAndDelete(holidayId);

    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({ message: 'Failed to delete holiday', error: error.message });
  }
});

// Get holidays in date range
router.get('/range/:startDate/:endDate', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const { departments, locations } = req.query;

    const deptArray = departments ? departments.split(',') : [];
    const locArray = locations ? locations.split(',') : [];

    const holidays = await Holiday.getHolidaysInRange(
      new Date(startDate),
      new Date(endDate),
      deptArray,
      locArray
    );

    res.json({ holidays });
  } catch (error) {
    console.error('Get holidays in range error:', error);
    res.status(500).json({ message: 'Failed to fetch holidays', error: error.message });
  }
});

// Check if date is holiday
router.get('/check/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const { department, location } = req.query;

    const holiday = await Holiday.isHoliday(
      new Date(date),
      department,
      location
    );

    res.json({
      isHoliday: !!holiday,
      holiday: holiday || null
    });
  } catch (error) {
    console.error('Check holiday error:', error);
    res.status(500).json({ message: 'Failed to check holiday', error: error.message });
  }
});

// Get upcoming holidays
router.get('/upcoming/:limit?', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.params;

    const holidays = await Holiday.getUpcomingHolidays(parseInt(limit));

    res.json({ holidays });
  } catch (error) {
    console.error('Get upcoming holidays error:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming holidays', error: error.message });
  }
});

// Get holiday calendar for a year
router.get('/calendar/:year', authenticateToken, async (req, res) => {
  try {
    const { year } = req.params;
    const { department, location } = req.query;

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const holidays = await Holiday.getHolidaysInRange(
      startOfYear,
      endOfYear,
      department ? [department] : [],
      location ? [location] : []
    );

    // Group holidays by month
    const calendar = {};
    holidays.forEach(holiday => {
      const month = holiday.date.getMonth();
      if (!calendar[month]) {
        calendar[month] = [];
      }
      calendar[month].push(holiday);
    });

    res.json({ calendar, holidays });
  } catch (error) {
    console.error('Get holiday calendar error:', error);
    res.status(500).json({ message: 'Failed to fetch holiday calendar', error: error.message });
  }
});

// Bulk create holidays
router.post('/bulk', authenticateToken, authorize('admin', 'hr_admin'), async (req, res) => {
  try {
    const { holidays } = req.body;
    const createdBy = req.user._id;

    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).json({ message: 'Holidays array is required' });
    }

    const createdHolidays = [];
    const errors = [];

    for (const holidayData of holidays) {
      try {
        // Check if holiday already exists
        const existingHoliday = await Holiday.findOne({ date: new Date(holidayData.date) });
        if (existingHoliday) {
          errors.push({
            date: holidayData.date,
            error: 'Holiday already exists on this date'
          });
          continue;
        }

        const holiday = new Holiday({
          ...holidayData,
          date: new Date(holidayData.date),
          createdBy
        });

        await holiday.save();
        createdHolidays.push(holiday);
      } catch (error) {
        errors.push({
          date: holidayData.date,
          error: error.message
        });
      }
    }

    res.status(201).json({
      message: `Created ${createdHolidays.length} holidays successfully`,
      created: createdHolidays.length,
      errors: errors.length,
      errorDetails: errors
    });
  } catch (error) {
    console.error('Bulk create holidays error:', error);
    res.status(500).json({ message: 'Failed to create holidays', error: error.message });
  }
});

module.exports = router;
