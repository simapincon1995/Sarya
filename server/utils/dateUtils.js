const Organization = require('../models/Organization');

/**
 * Get the start of today in the organization's timezone
 * Returns Date objects that represent the start of today/tomorrow in the org timezone
 * @returns {Promise<{today: Date, tomorrow: Date, timezone: string}>}
 */
async function getTodayInOrgTimezone() {
  try {
    const settings = await Organization.getSettings();
    const timezone = settings.timezone || 'America/New_York';
    
    const now = new Date();
    
    // Get the date string in the organization's timezone (YYYY-MM-DD format)
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const todayStr = formatter.format(now);
    const [year, month, day] = todayStr.split('-').map(Number);
    
    // Create a date string for midnight in the target timezone
    // We need to create a date that represents "YYYY-MM-DD 00:00:00" in the target timezone
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
    
    // Get what UTC time corresponds to midnight in the target timezone
    // We'll use a helper to find the UTC equivalent
    const utcMidnight = getUTCMidnightForTimezone(dateStr, timezone);
    
    const today = utcMidnight;
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    
    return {
      today,
      tomorrow,
      timezone
    };
  } catch (error) {
    console.error('Error getting today in org timezone:', error);
    // Fallback to server timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      today,
      tomorrow,
      timezone: 'America/New_York'
    };
  }
}

/**
 * Get UTC time that corresponds to midnight in a given timezone
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
 * @returns {Date} UTC Date object
 */
function getUTCMidnightForTimezone(dateStr, timezone) {
  // Create a date representing the local midnight in the target timezone
  // We'll create it by finding the UTC time that when formatted in the target timezone gives us the desired date at midnight
  
  // Try to find the UTC equivalent by iterating through possible UTC times
  // A simpler approach: use the fact that we can format a UTC date in the target timezone
  // and adjust backwards
  
  // Create date assuming it's UTC first
  const testDate = new Date(dateStr + 'Z'); // Z indicates UTC
  
  // Format this UTC date in the target timezone to see what time it represents there
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(testDate);
  const tzHour = parseInt(parts.find(p => p.type === 'hour').value);
  
  // Calculate the offset (hours difference)
  // If the UTC date shows a different hour than 0, we need to adjust
  const offsetHours = tzHour;
  
  // Adjust the date to account for the offset
  const adjustedDate = new Date(testDate);
  adjustedDate.setUTCHours(adjustedDate.getUTCHours() - offsetHours);
  
  // However, this is complex. Let's use a simpler method:
  // Create dates at various UTC times and check which one gives midnight in the target timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Try UTC dates from -12 to +14 hours (covers all timezones)
  for (let hour = -12; hour <= 14; hour++) {
    const candidate = new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
    const formatted = formatter.formatToParts(candidate);
    const tzHourCheck = parseInt(formatted.find(p => p.type === 'hour').value);
    const tzMinute = parseInt(formatted.find(p => p.type === 'minute').value);
    
    if (tzHourCheck === 0 && tzMinute === 0) {
      return candidate;
    }
  }
  
  // Fallback: return the test date
  return testDate;
}

/**
 * Format date in organization timezone
 */
async function formatDateInOrgTimezone(date, format = 'YYYY-MM-DD') {
  try {
    const settings = await Organization.getSettings();
    const timezone = settings.timezone || 'America/New_York';
    
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date in org timezone:', error);
    return date.toISOString().split('T')[0];
  }
}

module.exports = {
  getTodayInOrgTimezone,
  formatDateInOrgTimezone
};

