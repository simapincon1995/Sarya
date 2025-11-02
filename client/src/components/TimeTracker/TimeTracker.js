import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import './TimeTrackerRedesigned.css';

const TimeTracker = ({ attendanceStatus, onStatusUpdate, showActivityLog = false }) => {
  const [, setCurrentTime] = useState(new Date());
  const [workingTime, setWorkingTime] = useState('00:00:00');
  const [breakTime, setBreakTime] = useState('00:00:00');
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [dailyActivityLog, setDailyActivityLog] = useState([]);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [breakReason, setBreakReason] = useState('');
  const [breakType, setBreakType] = useState('lunch');
  const [isLoading, setIsLoading] = useState(false);
  useAuth(); // For authentication context
  const toast = useRef(null);

  const breakTypes = [
    { label: 'Lunch Break', value: 'lunch', icon: 'pi pi-utensils' },
    { label: 'Tea/Coffee Break', value: 'tea', icon: 'pi pi-coffee' },
    { label: 'Personal Break', value: 'personal', icon: 'pi pi-user' },
    { label: 'Meeting Break', value: 'meeting', icon: 'pi pi-users' },
    { label: 'Other', value: 'other', icon: 'pi pi-clock' }
  ];

  // Enhanced check-in status logic - handle API response structure
  const attendanceData = attendanceStatus?.attendance || attendanceStatus;
  const checkInTime = attendanceData?.checkIn?.time || attendanceData?.checkIn || attendanceData?.checkInTime;
  const checkOutTime = attendanceData?.checkOut?.time || attendanceData?.checkOut || attendanceData?.checkOutTime;
  
  const isCheckedIn = (() => {
    // Only consider checked in if we have a valid check-in time and no check-out time
    if (checkInTime && !checkOutTime) return true;
    
    // Check API status for checked-in or on-break states
    if (attendanceStatus?.status === 'checked-in' || attendanceStatus?.status === 'on-break') return true;
    
    return false;
  })();
  
  const hasCheckedOutToday = (() => {
    // Only consider checked out if we have a valid check-out time
    if (checkOutTime) return true;
    
    // Or if API explicitly says checked-out
    if (attendanceStatus?.status === 'checked-out') return true;
    
    return false;
  })();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // REMOVED: Auto-refresh to prevent multiple API calls
  // The parent component (Attendance.js) will handle initial data loading

  // Calculate working time and break time
  const updateTimers = useCallback(() => {
    if (!checkInTime) return;

    const checkInDate = new Date(checkInTime);
    const now = new Date();
    
    const totalMinutes = Math.floor((now - checkInDate) / (1000 * 60));
    const totalBreakMinutes = attendanceData?.totalBreakTime || 0;
    const workingMinutes = Math.max(0, totalMinutes - totalBreakMinutes);
    
    const newWorkingTime = formatDuration(workingMinutes);
    const newBreakTime = formatDuration(totalBreakMinutes);
    
    // Only update state if values actually changed
    setWorkingTime(prevTime => prevTime !== newWorkingTime ? newWorkingTime : prevTime);
    setBreakTime(prevTime => prevTime !== newBreakTime ? newBreakTime : prevTime);
    
    const activeBreak = attendanceData?.breaks?.find(b => b.isActive && !b.endTime) || attendanceStatus?.attendance?.activeBreak;
    const newIsOnBreak = !!activeBreak || attendanceStatus?.status === 'on-break';
    setIsOnBreak(prevBreak => prevBreak !== newIsOnBreak ? newIsOnBreak : prevBreak);
  }, [attendanceData, checkInTime, attendanceStatus]);

  // Update daily activity log
  const updateActivityLog = useCallback(() => {
    const activities = [];
    
    // Add check-in activity
    if (checkInTime) {
      try {
        const ts = new Date(checkInTime);
        if (!isNaN(ts.getTime())) {
          activities.push({
            id: 'checkin',
            timestamp: ts,
            time: formatTime(ts),
            description: 'Checked In'
          });
        }
      } catch (error) {
        console.error('Error processing check-in time:', error);
      }
    }

    // Add break activities
    if (attendanceData?.breaks && attendanceData.breaks.length > 0) {
      attendanceData.breaks.forEach((breakItem, index) => {
        if (breakItem.startTime) {
          try {
            const tsStart = new Date(breakItem.startTime);
            if (!isNaN(tsStart.getTime())) {
              activities.push({
                id: `break-start-${index}`,
                timestamp: tsStart,
                time: formatTime(tsStart),
                description: 'Started Break'
              });
            }
          } catch (error) {
            console.error('Error processing break start time:', error);
          }
        }
        
        if (breakItem.endTime) {
          try {
            const tsEnd = new Date(breakItem.endTime);
            if (!isNaN(tsEnd.getTime())) {
              activities.push({
                id: `break-end-${index}`,
                timestamp: tsEnd,
                time: formatTime(tsEnd),
                description: 'Ended Break'
              });
            }
          } catch (error) {
            console.error('Error processing break end time:', error);
          }
        }
      });
    }

    // Add check-out activity
    if (checkOutTime) {
      try {
        const ts = new Date(checkOutTime);
        if (!isNaN(ts.getTime())) {
          activities.push({
            id: 'checkout',
            timestamp: ts,
            time: formatTime(ts),
            description: 'Checked Out'
          });
        }
      } catch (error) {
        console.error('Error processing check-out time:', error);
      }
    }

    // Sort activities by actual timestamps (ascending)
    activities.sort((a, b) => (a.timestamp?.getTime?.() || 0) - (b.timestamp?.getTime?.() || 0));
    setDailyActivityLog(activities);
  }, [attendanceData, checkInTime, checkOutTime]);

  // Update timers and activity log only when attendance status changes
  useEffect(() => {
    if (attendanceStatus) {
      updateTimers();
      updateActivityLog();
    }
  }, [attendanceStatus, updateActivityLog, updateTimers]);

  const formatTime = (date) => {
    if (!date) return 'Invalid Date';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid Date';
      return dateObj.toLocaleTimeString('en-US', { 
        hour12: true,
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Date';
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  };

  // Handle Check-in
  const handleCheckIn = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await attendanceService.checkIn(
        { latitude: 0, longitude: 0, address: 'Office' },
        '127.0.0.1',
        'Web Browser'
      );
      
      toast.current?.show({
        severity: 'success',
        summary: 'Checked In Successfully',
        detail: 'Your work day has started. Have a productive day!',
        life: 4000
      });
      
      // Only refresh status after successful check-in
      onStatusUpdate();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to check in. Please try again.';
      
      // If already checked in, refresh status to show correct state
      if (errorMessage.toLowerCase().includes('already checked in')) {
        toast.current?.show({
          severity: 'info',
          summary: 'Already Checked In',
          detail: 'You are already checked in for today. Refreshing status...',
          life: 4000
        });
        // Refresh to get the current state
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        toast.current?.show({
          severity: 'error',
          summary: 'Check-in Failed',
          detail: errorMessage,
          life: 5000
        });
        // Don't refresh on regular errors to avoid unnecessary API calls
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Check-out
  const handleCheckOut = async () => {
    if (isLoading || isOnBreak) return;
    
    confirmDialog({
      message: 'Are you sure you want to check out? This will end your work day.',
      header: 'Confirm Check Out',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        setIsLoading(true);
        try {
          await attendanceService.checkOut(
            { latitude: 0, longitude: 0, address: 'Office' },
            '127.0.0.1',
            'Web Browser'
          );
          
          toast.current?.show({
            severity: 'success',
            summary: 'Checked Out Successfully',
            detail: 'Thank you for your hard work today!',
            life: 4000
          });
          
          onStatusUpdate();
        } catch (error) {
          toast.current?.show({
            severity: 'error',
            summary: 'Check-out Failed',
            detail: 'Failed to check out. Please try again.',
            life: 5000
          });
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Handle Start Break
  const handleStartBreak = async () => {
    if (isLoading || !breakType) return;
    
    setIsLoading(true);
    try {
      await attendanceService.startBreak(breakType, breakReason);
      
      toast.current?.show({
        severity: 'info',
        summary: 'Break Started',
        detail: `Enjoy your ${breakTypes.find(b => b.value === breakType)?.label.toLowerCase()}!`,
        life: 3000
      });
      
      setShowBreakDialog(false);
      setBreakReason('');
      setBreakType('lunch');
      onStatusUpdate();
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Failed to Start Break',
        detail: 'Unable to start break. Please try again.',
        life: 4000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle End Break
  const handleEndBreak = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await attendanceService.endBreak();
      
      toast.current?.show({
        severity: 'success',
        summary: 'Break Ended',
        detail: 'Welcome back! Ready to continue your productive work.',
        life: 3000
      });
      
      onStatusUpdate();
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Failed to End Break',
        detail: 'Unable to end break. Please try again.',
        life: 4000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="time-tracker-wireframe">
      <Toast ref={toast} />
      
      {!showActivityLog ? (
        // Today's Actions View
        <>
          {/* Current Status */}
          <div className="current-status">
            <h3>CURRENT STATUS:</h3>
            <div className="status-value">
              {(() => {
                if (hasCheckedOutToday) return 'CHECKED OUT';
                if (attendanceStatus?.status === 'on-break') return 'ON BREAK';
                if (isCheckedIn) return 'CHECKED IN';
                return 'NOT CHECKED IN';
              })()}
            </div>
            {isCheckedIn && checkInTime  && (
              <div className="text-color-secondary" style={{ marginTop: '0.5rem' }}>
                Checked in at {formatTime(new Date(checkInTime))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons-grid">
            {isCheckedIn  && (
              <>
                {isOnBreak ? (
                  <Button
                    label="END BREAK"
                    className="action-btn resume-btn"
                    onClick={handleEndBreak}
                    loading={isLoading}
                    disabled={isLoading}
                  />
                ) : (
                  <Button
                    label="START BREAK"
                    className="action-btn break-btn"
                    onClick={() => setShowBreakDialog(true)}
                    disabled={isLoading}
                  />
                )}
              </>
            )}
            
            {!isCheckedIn  && (
              <Button
                label="CHECK IN"
                className="action-btn checkin-btn"
                onClick={handleCheckIn}
                loading={isLoading}
                disabled={isLoading}
              />
            )}
            
            {isCheckedIn  && !isOnBreak && (
              <Button
                label="CHECK OUT"
                className="action-btn checkout-btn"
                onClick={handleCheckOut}
                loading={isLoading}
                disabled={isLoading}
              />
            )}
            
            {hasCheckedOutToday && (
              <Button
                label="ALREADY CHECKED OUT"
                className="action-btn checked-out-btn"
                disabled={true}
              />
            )}
          </div>

          {/* Today's Overview */}
          <div className="todays-overview">
            <div className="time-summary">
              <div className="time-row">
                <span className="time-label">TOTAL WORKED:</span>
                <span className="time-value">{workingTime}</span>
              </div>
              <div className="time-row">
                <span className="time-label">TOTAL BREAK:</span>
                <span className="time-value">{breakTime}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Activity Log View
        <>
          <div className="activity-log-content">
            {dailyActivityLog.length > 0 ? (
              <div className="activity-list">
                <div className="activity-item" style={{ fontWeight: 600 }}>
                  <div className="activity-time">Time</div>
                  <div className="activity-description">Action</div>
                </div>
                {dailyActivityLog.map((activity, index) => (
                  <div key={activity.id || index} className="activity-item">
                    <div className="activity-time">{activity.time}</div>
                    <div className="activity-description">{activity.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-activity-simple">
                <p>No activities recorded yet.</p>
              </div>
            )}
          </div>
          
          {/* Checkout Button in Activity Log */}
          {isCheckedIn  && !isOnBreak && (
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <Button
                label="CHECK OUT"
                className="action-btn checkout-btn"
                onClick={handleCheckOut}
                loading={isLoading}
                disabled={isLoading}
              />
            </div>
          )}
          
          {/* Show message if already checked out */}
          {hasCheckedOutToday && (
            <div style={{ marginTop: '1rem', textAlign: 'center', color: '#6c757d' }}>
              <i className="pi pi-check-circle" style={{ marginRight: '0.5rem' }}></i>
              You have already checked out for today
            </div>
          )}
        </>
      )}

      {/* Break Dialog */}
      <Dialog
        header="Take a Break"
        visible={showBreakDialog}
        onHide={() => setShowBreakDialog(false)}
        style={{ width: '400px' }}
        modal
        className="break-dialog"
      >
        <div className="break-form">
          <div className="field">
            <label htmlFor="breakType">Break Type</label>
            <Dropdown
              id="breakType"
              value={breakType}
              options={breakTypes}
              onChange={(e) => setBreakType(e.value)}
              placeholder="Select break type"
              className="w-full"
            />
          </div>
          
          <div className="field">
            <label htmlFor="breakReason">Reason (Optional)</label>
            <InputTextarea
              id="breakReason"
              value={breakReason}
              onChange={(e) => setBreakReason(e.target.value)}
              rows={3}
              placeholder="Why are you taking this break?"
              className="w-full"
            />
          </div>
          
          <div className="dialog-actions">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setShowBreakDialog(false)}
            />
            <Button
              label="Start Break"
              icon="pi pi-pause"
              className="p-button-warning"
              onClick={handleStartBreak}
              loading={isLoading}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TimeTracker;