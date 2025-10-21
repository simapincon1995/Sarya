import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { attendanceService } from '../services/attendanceService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import TimeTracker from '../components/TimeTracker/TimeTracker';
import QuickStats from '../components/QuickStats/QuickStats';
import './Attendance.css';

const Attendance = () => {
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const toast = React.useRef(null);
  const loadingRef = React.useRef(false);

  const loadTodayAttendance = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    
    try {
      loadingRef.current = true;
      setIsLoading(true);
      const data = await attendanceService.getTodayAttendance();
      console.log('Attendance API Response:', data);
      setAttendanceStatus(data);
      setHasInitialLoad(true);
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load today\'s attendance'
      });
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!hasInitialLoad && !loadingRef.current) {
      loadTodayAttendance();
    }
  }, [loadTodayAttendance, hasInitialLoad]);

  if (isLoading) {
    return <LoadingSpinner message="Loading attendance..." />;
  }

  const attendanceData = attendanceStatus?.attendance || attendanceStatus;
  const checkInTime = attendanceData?.checkIn?.time || attendanceData?.checkIn;
  const checkOutTime = attendanceData?.checkOut?.time || attendanceData?.checkOut;
  const isCheckedIn = (checkInTime && !checkOutTime) || attendanceStatus?.status === 'checked-in' || attendanceStatus?.status === 'on-break';

  const formatTime = (dateString) => {
    if (!dateString) return 'Invalid Date';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', { 
        hour12: true,
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Date';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="attendance-page">
      <Toast ref={toast} />
      
      {/* Header Section */}
      <div className="attendance-header">
        <div className="header-left">
          <div className="date-navigation">
            <Button icon="pi pi-chevron-left" className="p-button-text nav-btn" />
            <span className="current-date">{formatDate(new Date())}</span>
            <Button icon="pi pi-chevron-right" className="p-button-text nav-btn" />
          </div>
        </div>
        <div className="header-right">
          {isCheckedIn && checkInTime && (
            <div className="checkin-status">
              <span className="checkin-label">Checked In:</span>
              <span className="checkin-time">{formatTime(checkInTime)}</span>
            </div>
          )}
        </div>
      </div>

      {/* QuickStats Section */}
      <div className="quickstats-section">
        <QuickStats attendanceStatus={attendanceStatus} />
      </div>

      {/* Main Content Grid */}
      <div className="attendance-main-content">
        {/* Today's Actions */}
        <div className="todays-actions-section">
          <Card className="actions-card">
            <div className="actions-header">
              <h3>Today's Actions</h3>
            </div>
            <div className="actions-content">
              <TimeTracker 
                attendanceStatus={attendanceStatus} 
                onStatusUpdate={loadTodayAttendance}
              />
            </div>
          </Card>
        </div>

        {/* Activity Log */}
        <div className="activity-log-section">
          <Card className="activity-card">
            <div className="activity-header">
              <h3>Activity Log</h3>
            </div>
            <div className="activity-content">
              <TimeTracker 
                attendanceStatus={attendanceStatus} 
                onStatusUpdate={loadTodayAttendance}
                showActivityLog={true}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Attendance;