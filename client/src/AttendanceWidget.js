import React, { useState, useEffect, useCallback } from 'react';
import { attendanceService } from './services/attendanceService';
import PRODUCTION_CONFIG from './config/production.config';
import './AttendanceWidget.css';

const ATTENDANCE_EVENTS = {
  LOGIN: 'login',
  PUNCH_IN: 'punch_in',
  BREAK_START: 'break_start',
  BREAK_STOP: 'break_stop',
  PUNCH_OUT: 'punch_out'
};

const ATTENDANCE_STATUS = {
  LOGGED_OUT: 'logged_out',
  LOGGED_IN: 'logged_in',
  WORKING: 'working',
  ON_BREAK: 'on_break',
  CHECKED_OUT: 'checked_out' // Work day completed
};

const AttendanceWidget = () => {
  const [currentStatus, setCurrentStatus] = useState(ATTENDANCE_STATUS.LOGGED_OUT);
  const [currentUser, setCurrentUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loginCredentials, setLoginCredentials] = useState({ email: '', password: '' });
  const [showLogin, setShowLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);

  const getDeviceId = useCallback(() => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'desktop_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }, []);

  const fetchTodayAttendance = useCallback(async () => {
    if (!isOnline) return;
    
    try {
      setIsLoading(true);
      const todayData = await attendanceService.getTodayAttendance();
      
      // Store attendance data for display
      setAttendanceData(todayData);
      
      // Update status based on API response
      switch (todayData.status) {
        case 'not-checked-in':
          setCurrentStatus(ATTENDANCE_STATUS.LOGGED_IN);
          break;
        case 'checked-in':
          setCurrentStatus(ATTENDANCE_STATUS.WORKING);
          break;
        case 'on-break':
          setCurrentStatus(ATTENDANCE_STATUS.ON_BREAK);
          break;
        case 'checked-out':
          setCurrentStatus(ATTENDANCE_STATUS.CHECKED_OUT);
          break;
        default:
          setCurrentStatus(ATTENDANCE_STATUS.LOGGED_IN);
      }
    } catch (error) {
      console.error('Failed to fetch today\'s attendance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  const syncPendingEvents = useCallback(async () => {
    if (pendingEvents.length > 0 && isOnline) {
      try {
        for (const event of pendingEvents) {
          switch (event.type) {
            case ATTENDANCE_EVENTS.PUNCH_IN:
              await attendanceService.checkIn(event.location, event.ipAddress, event.deviceInfo);
              break;
            case ATTENDANCE_EVENTS.PUNCH_OUT:
              await attendanceService.checkOut(event.location, event.ipAddress, event.deviceInfo);
              break;
            case ATTENDANCE_EVENTS.BREAK_START:
              await attendanceService.startBreak(event.breakType, event.reason);
              break;
            case ATTENDANCE_EVENTS.BREAK_STOP:
              await attendanceService.endBreak();
              break;
            default:
              console.warn('Unknown event type during sync:', event.type);
          }
        }
        setPendingEvents([]);
      } catch (error) {
        console.error('Failed to sync pending events:', error);
      }
    }
  }, [pendingEvents, isOnline]);

  const sendAttendanceEvent = useCallback(async (eventType) => {
    const deviceId = getDeviceId();
    
    // Create proper location object as expected by the API
    const locationData = {
      latitude: 0,
      longitude: 0,
      address: 'Desktop Widget'
    };
    
    const eventData = {
      type: eventType,
      location: locationData,
      ipAddress: 'Desktop',
      deviceInfo: deviceId,
      breakType: 'other',
      reason: 'Break via desktop widget'
    };

    if (isOnline) {
      try {
        switch (eventType) {
          case ATTENDANCE_EVENTS.PUNCH_IN:
            await attendanceService.checkIn(eventData.location, eventData.ipAddress, eventData.deviceInfo);
            break;
          case ATTENDANCE_EVENTS.PUNCH_OUT:
            await attendanceService.checkOut(eventData.location, eventData.ipAddress, eventData.deviceInfo);
            break;
          case ATTENDANCE_EVENTS.BREAK_START:
            await attendanceService.startBreak(eventData.breakType, eventData.reason);
            break;
          case ATTENDANCE_EVENTS.BREAK_STOP:
            await attendanceService.endBreak();
            break;
          default:
            throw new Error('Invalid event type');
        }
      } catch (error) {
        console.error('Failed to send event:', error);
        // Add to pending events if API call fails
        setPendingEvents(prev => [...prev, eventData]);
        throw error;
      }
    } else {
      // Store locally if offline
      setPendingEvents(prev => [...prev, eventData]);
    }
  }, [isOnline, getDeviceId]);

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingEvents();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingEvents]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedStatus = localStorage.getItem('attendanceStatus');
    const savedPendingEvents = localStorage.getItem('pendingEvents');
    const savedToken = localStorage.getItem('token');

    // Only restore session if both user and token exist
    if (savedUser && savedToken) {
      setCurrentUser(JSON.parse(savedUser));
      setShowLogin(false);
      // Fetch current attendance status on app load
      fetchTodayAttendance();
    } else {
      // Clear invalid session data
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
    }
    
    if (savedStatus) {
      setCurrentStatus(savedStatus);
    }
    if (savedPendingEvents) {
      setPendingEvents(JSON.parse(savedPendingEvents));
    }
  }, [fetchTodayAttendance]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    localStorage.setItem('attendanceStatus', currentStatus);
    localStorage.setItem('pendingEvents', JSON.stringify(pendingEvents));
  }, [currentUser, currentStatus, pendingEvents]);

  const handleLogin = async () => {
    try {
      // Use production config for Electron app, otherwise use environment variables
      const API_BASE_URL = window.electron 
        ? PRODUCTION_CONFIG.API_URL 
        : (process.env.REACT_APP_API_URL || 
          (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api'));
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginCredentials)
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Store the token for API authentication
        if (userData.token) {
          localStorage.setItem('token', userData.token);
        }
        
        setCurrentUser(userData);
        setShowLogin(false);
        
        // Fetch today's attendance to set correct status
        await fetchTodayAttendance();
        
        // No need to send login event - just log for debugging
        console.log('User logged in via desktop widget:', userData.user?.email);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handlePunchIn = async () => {
    try {
      await sendAttendanceEvent(ATTENDANCE_EVENTS.PUNCH_IN);
      // Refresh attendance status to get updated state
      await fetchTodayAttendance();
    } catch (error) {
      // Check if already checked in
      if (error.message && error.message.includes('Already checked in today')) {
        await fetchTodayAttendance(); // Refresh to get correct status
      } else {
        alert('Failed to punch in. ' + error.message);
      }
    }
  };

  const handleBreakStart = async () => {
    try {
      await sendAttendanceEvent(ATTENDANCE_EVENTS.BREAK_START);
      await fetchTodayAttendance();
    } catch (error) {
      alert('Failed to start break. ' + error.message);
    }
  };

  const handleBreakStop = async () => {
    try {
      await sendAttendanceEvent(ATTENDANCE_EVENTS.BREAK_STOP);
      await fetchTodayAttendance();
    } catch (error) {
      alert('Failed to stop break. ' + error.message);
    }
  };

  const handlePunchOut = async () => {
    try {
      await sendAttendanceEvent(ATTENDANCE_EVENTS.PUNCH_OUT);
      // Refresh attendance status to show "Work Day Completed"
      await fetchTodayAttendance();
    } catch (error) {
      if (error.message && error.message.includes('Already checked out today')) {
        await fetchTodayAttendance(); // Refresh to get correct status
      } else {
        alert('Failed to punch out. ' + error.message);
      }
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setCurrentStatus(ATTENDANCE_STATUS.LOGGED_OUT);
    setShowLogin(true);
    
    // Clear all stored data including the auth token
    localStorage.removeItem('currentUser');
    localStorage.removeItem('attendanceStatus');
    localStorage.removeItem('token');
  };

  const getStatusText = () => {
    switch (currentStatus) {
      case ATTENDANCE_STATUS.LOGGED_OUT:
        return 'Logged Out';
      case ATTENDANCE_STATUS.LOGGED_IN:
        return 'Ready to Work';
      case ATTENDANCE_STATUS.WORKING:
        return 'Working';
      case ATTENDANCE_STATUS.ON_BREAK:
        return 'On Break';
      case ATTENDANCE_STATUS.CHECKED_OUT:
        return 'Work Day Completed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (currentStatus) {
      case ATTENDANCE_STATUS.LOGGED_OUT:
        return '#dc3545'; // Red
      case ATTENDANCE_STATUS.LOGGED_IN:
        return '#ffc107'; // Yellow
      case ATTENDANCE_STATUS.WORKING:
        return '#28a745'; // Green
      case ATTENDANCE_STATUS.ON_BREAK:
        return '#17a2b8'; // Blue
      case ATTENDANCE_STATUS.CHECKED_OUT:
        return '#6f42c1'; // Purple
      default:
        return '#6c757d'; // Gray
    }
  };

  // Helper functions for date/time formatting
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getActivityLog = () => {
    if (!attendanceData?.attendance) return [];
    
    const activities = [];
    const attendance = attendanceData.attendance;
    
    // Add check-in
    if (attendance.checkIn?.time) {
      activities.push({
        type: 'Check In',
        time: attendance.checkIn.time,
        icon: '🚀',
        description: 'Started work day'
      });
    }
    
    // Add breaks
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach((breakItem, index) => {
        if (breakItem.startTime) {
          activities.push({
            type: 'Break Start',
            time: breakItem.startTime,
            icon: '☕',
            description: `Break ${index + 1} started (${breakItem.breakType || 'other'})`
          });
        }
        if (breakItem.endTime) {
          activities.push({
            type: 'Break End',
            time: breakItem.endTime,
            icon: '▶️',
            description: `Break ${index + 1} ended`
          });
        }
      });
    }
    
    // Add check-out
    if (attendance.checkOut?.time) {
      activities.push({
        type: 'Check Out',
        time: attendance.checkOut.time,
        icon: '⏹️',
        description: 'Ended work day'
      });
    }
    
    // Sort by time
    return activities.sort((a, b) => new Date(a.time) - new Date(b.time));
  };

  if (showLogin) {
    return (
      <div className="attendance-widget">
        <div className="widget-header">
          <div className="widget-brand">
            <img 
              src="/assets/logo.jfif" 
              alt="Sarya Connective Logo" 
              className="widget-logo"
            />
            <h3>Sarya Connective</h3>
          </div>
          <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
        </div>
        
        <div className="login-form">
          <input
            type="email"
            placeholder="Email Address"
            value={loginCredentials.email}
            onChange={(e) => setLoginCredentials(prev => ({ ...prev, email: e.target.value }))}
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={loginCredentials.password}
            onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
            className="login-input"
          />
          <button onClick={handleLogin} className="btn btn-primary">
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-widget">
      <div className="widget-header">
        <div className="widget-brand">
          <img 
            src="/assets/logo.jfif" 
            alt="Sarya Connective Logo" 
            className="widget-logo"
          />
          <h3>Sarya Connective Global</h3>
        </div>
        <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
          {/* {pendingEvents.length > 0 && (
            <span className="pending-sync">({pendingEvents.length} pending)</span>
          )} */}
        </div>
      </div>

      <div className="user-info">
        <div className="user-name">👤 {currentUser?.user?.firstName || currentUser?.user?.username}</div>
        <div className="status-indicator" style={{ backgroundColor: getStatusColor() }}>
          Status: {getStatusText()}
        </div>
      </div>

      {/* Today's Attendance Details */}
      <div className="attendance-details">
        <div className="today-info">
          <h3>📅 {formatDate(new Date())}</h3>
          {attendanceData?.attendance?.checkIn?.time && (
            <div className="punch-time">
              <span className="label">Punch In:</span>
              <span className="time">{formatTime(attendanceData.attendance.checkIn.time)}</span>
            </div>
          )}
        </div>
        
        {/* Activity Log */}
        <div className="activity-log">
          <h4>🕒 Today's Activity</h4>
          <div className="activity-list">
            {getActivityLog().length > 0 ? (
              getActivityLog().map((activity, index) => (
                <div key={index} className="activity-item">
                  <span className="activity-icon">{activity.icon}</span>
                  <div className="activity-details">
                    <span className="activity-type">{activity.type}</span>
                    <span className="activity-time">{formatTime(activity.time)}</span>
                    <span className="activity-desc">{activity.description}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity">
                <span>📝 No activities recorded yet today</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="action-buttons">
        {isLoading ? (
          <div className="loading-indicator">
            <span>🔄 Loading status...</span>
          </div>
        ) : (
          <>
            {/* Show Punch In when logged in but not checked in */}
            {currentStatus === ATTENDANCE_STATUS.LOGGED_IN && (
              <>
                <button onClick={handlePunchIn} className="btn btn-success" disabled={isLoading}>
                  🚀 Punch In / Start Work
                </button>
                <button onClick={handleLogout} className="btn btn-danger" disabled={isLoading}>
                  🚪 Logout
                </button>
              </>
            )}

            {/* Show Break and Punch Out when actively working */}
            {currentStatus === ATTENDANCE_STATUS.WORKING && (
              <>
                <button onClick={handleBreakStart} className="btn btn-info" disabled={isLoading}>
                  ☕ Start Break
                </button>
                <button onClick={handlePunchOut} className="btn btn-warning" disabled={isLoading}>
                  ⏹️ Punch Out
                </button>
              </>
            )}

            {/* Show only Break Stop when on break */}
            {currentStatus === ATTENDANCE_STATUS.ON_BREAK && (
              <button onClick={handleBreakStop} className="btn btn-success" disabled={isLoading}>
                ▶️ Stop Break
              </button>
            )}

            {/* Show only Logout when work day is completed */}
            {currentStatus === ATTENDANCE_STATUS.CHECKED_OUT && (
              <>
                <div className="work-day-completed">
                  <p>✅ Your work day is completed!</p>
                  <p>You cannot punch in again today.</p>
                </div>
                <button onClick={handleLogout} className="btn btn-danger" disabled={isLoading}>
                  🚪 Logout
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceWidget;