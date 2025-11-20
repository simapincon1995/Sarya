const Attendance = require('../models/Attendance');

/**
 * Get the retention days from environment variable
 * Defaults to 45 days if not configured
 */
function getRetentionDays() {
  const retentionDays = parseInt(process.env.ATTENDANCE_RETENTION_DAYS, 10);
  return isNaN(retentionDays) || retentionDays < 1 ? 45 : retentionDays;
}

/**
 * Cleanup attendance records older than configured retention days
 * This function deletes all attendance records where the date is older than the retention period from today
 */
async function cleanupOldAttendanceRecords() {
  try {
    const retentionDays = getRetentionDays();
    
    // Calculate the cutoff date (retention days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    cutoffDate.setHours(0, 0, 0, 0); // Start of the day

    // Find and delete records older than retention period
    const result = await Attendance.deleteMany({
      date: { $lt: cutoffDate }
    });

    console.log(`🧹 Cleanup completed: Deleted ${result.deletedCount} attendance record(s) older than ${retentionDays} days (before ${cutoffDate.toISOString().split('T')[0]})`);
    
    return {
      success: true,
      deletedCount: result.deletedCount,
      cutoffDate: cutoffDate.toISOString(),
      retentionDays: retentionDays
    };
  } catch (error) {
    console.error('❌ Error during attendance cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Schedule cleanup to run daily at midnight
 * Uses setInterval to check every hour and run cleanup at midnight
 */
function scheduleDailyCleanup() {
  // Run cleanup immediately on server start
  console.log('🔄 Running initial attendance cleanup...');
  cleanupOldAttendanceRecords();

  // Calculate milliseconds until next midnight
  function getMillisecondsUntilMidnight() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Next midnight
    return midnight.getTime() - now.getTime();
  }

  // Schedule cleanup at midnight
  function scheduleNextCleanup() {
    const msUntilMidnight = getMillisecondsUntilMidnight();
    
    setTimeout(() => {
      console.log('🕛 Running scheduled attendance cleanup at midnight...');
      cleanupOldAttendanceRecords();
      
      // Schedule next cleanup for 24 hours later (daily)
      setInterval(() => {
        console.log('🕛 Running scheduled attendance cleanup at midnight...');
        cleanupOldAttendanceRecords();
      }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    }, msUntilMidnight);
  }

  scheduleNextCleanup();
  const retentionDays = getRetentionDays();
  console.log(`✅ Attendance cleanup scheduler initialized (runs daily at midnight, retention: ${retentionDays} days)`);
}

module.exports = {
  cleanupOldAttendanceRecords,
  scheduleDailyCleanup,
  getRetentionDays
};

