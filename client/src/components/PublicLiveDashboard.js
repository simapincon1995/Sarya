import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { useSocket } from '../contexts/SocketContext';
import { attendanceService } from '../services/attendanceService';
import { dashboardService } from '../services/dashboardService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './PublicLiveDashboard.css';

const PublicLiveDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [performerOfDay, setPerformerOfDay] = useState(null);
  const [customWidgets, setCustomWidgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState({});
  const { realtimeData } = useSocket();

  // Throttle function to prevent too frequent API calls
  const throttleRequest = useCallback((key, minInterval = 5000) => {
    const now = Date.now();
    const lastTime = lastRequestTime[key] || 0;
    if (now - lastTime < minInterval) {
      return false; // Request is throttled
    }
    setLastRequestTime(prev => ({ ...prev, [key]: now }));
    return true;
  }, [lastRequestTime]);

  const loadDashboardData = useCallback(async () => {
    if (!throttleRequest('dashboard', 10000)) return; // Min 10 seconds between dashboard calls
    
    try {
      const data = await attendanceService.getPublicDashboardOverview();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limited - will retry later');
        // Don't update state on rate limit to avoid UI flicker
      }
    } finally {
      setIsLoading(false);
    }
  }, [throttleRequest]);

  const loadPerformerOfDay = useCallback(async () => {
    if (!throttleRequest('performer', 15000)) return; // Min 15 seconds between performer calls
    
    try {
      const response = await dashboardService.getPerformerOfDay();
      // Only set performer if widget exists and has performerData
      if (response.widget && response.widget.performerData && response.widget.performerData.employeeName) {
        setPerformerOfDay(response.widget);
      } else {
        setPerformerOfDay(null);
      }
    } catch (error) {
      console.error('Error loading performer of day:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limited - will retry later');
      }
      setPerformerOfDay(null);
    }
  }, [throttleRequest]);

  const loadCustomWidgets = useCallback(async () => {
    if (!throttleRequest('widgets', 20000)) return; // Min 20 seconds between widget calls
    
    try {
      const response = await dashboardService.getPublicDashboardWidgets();
      // Filter out performer of day and limit to 3 custom widgets
      const customWidgets = response.widgets
        .filter(widget => widget.name !== 'performer-of-day' && widget.isVisible && widget.isPublic)
        .slice(0, 3);
      setCustomWidgets(customWidgets);
    } catch (error) {
      console.error('Error loading custom widgets:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limited - will retry later');
      }
      setCustomWidgets([]);
    }
  }, [throttleRequest]);

  useEffect(() => {
    loadDashboardData();
    loadPerformerOfDay();
    loadCustomWidgets();
    const interval = setInterval(() => {
      loadDashboardData();
      loadPerformerOfDay();
      loadCustomWidgets();
    }, 60000); // Refresh every 60 seconds (increased from 30 seconds)
    return () => clearInterval(interval);
  }, [loadDashboardData, loadPerformerOfDay, loadCustomWidgets]);

  useEffect(() => {
    if (realtimeData.attendance || realtimeData.leaves || realtimeData.dashboard) {
      loadDashboardData();
    }
  }, [realtimeData, loadDashboardData]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading live dashboard..." />;
  }

  if (!dashboardData) {
    return (
      <div className="text-center p-4">
        <p>No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className={`public-live-dashboard ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Horizontal Navigation Header */}
      <div className="public-dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <img 
              src="/assets/logo.jfif" 
              alt="Company Logo" 
              className="company-logo"
            />
            <div className="company-info">
              <h1 className="company-name">Sarya Connective</h1>
              <p className="dashboard-title">Live Dashboard</p>
            </div>
          </div>
          
          <div className="header-actions">
            <Button
              icon="pi pi-refresh"
              className="p-button-outlined p-button-sm"
              onClick={loadDashboardData}
              tooltip="Refresh Data"
            />
            <Button
              icon={isFullscreen ? "pi pi-window-minimize" : "pi pi-window-maximize"}
              className="p-button-outlined p-button-sm"
              onClick={toggleFullscreen}
              tooltip={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        <div className={`dashboard-grid ${customWidgets.length === 0 ? 'no-custom-widgets' : ''}`}>
          {/* Statistics Row */}
          <div className="stats-grid">
            <Card className="stat-card">
              <div className="stat-icon">
                <i className="pi pi-users" style={{ color: '#4CAF50' }}></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{dashboardData.overview.totalEmployees}</div>
                <div className="stat-label">Total Employees</div>
                <div className="stat-comparison">
                  <i className="pi pi-building"></i>
                  All Roles
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="stat-icon">
                <i className="pi pi-check-circle" style={{ color: '#2196F3' }}></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{dashboardData.overview.presentToday}</div>
                <div className="stat-label">Present Today</div>
                <div className="stat-comparison">
                  <i className="pi pi-clock"></i>
                  Checked In
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="stat-icon">
                <i className="pi pi-pause-circle" style={{ color: '#FF9800' }}></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{dashboardData.overview.onBreak}</div>
                <div className="stat-label">On Break</div>
                <div className="stat-comparison">
                  <i className="pi pi-coffee"></i>
                  Active Breaks
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="stat-icon">
                <i className="pi pi-times-circle" style={{ color: '#F44336' }}></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{dashboardData.overview.absent}</div>
                <div className="stat-label">Absent</div>
                <div className="stat-comparison">
                  <i className="pi pi-user-minus"></i>
                  Not Present
                </div>
              </div>
            </Card>
            
            {/* Performer of the Day Card in Statistics Row */}
            {performerOfDay ? (
              <Card className="performer-stat-card">
                <div className="performer-stat-icon">
                  <i className="pi pi-trophy" style={{ color: '#2C2C2C' }}></i>
                </div>
                <div className="performer-stat-content">
                  <div className="performer-stat-name">{performerOfDay.performerData.employeeName}</div>
                  <div className="performer-stat-department">{performerOfDay.performerData.department}</div>
                  <div className="performer-stat-achievement">{performerOfDay.performerData.achievement}</div>
                  <div className="performer-stat-badge">
                    <i className="performer-stat-badge-icon pi pi-trophy"></i>
                    <span className="performer-stat-badge-text">Performer of the Day</span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="stat-card">
                <div className="stat-icon">
                  <i className="pi pi-star" style={{ color: '#666' }}></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value" style={{ fontSize: '1.2rem', color: '#666' }}>No Performer</div>
                  <div className="stat-label">Performer of the Day</div>
                  <div className="stat-comparison">
                    <i className="pi pi-info-circle"></i>
                    Not Set
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Second Row - On Break, Attendance Rate, Recent Activity */}
          <div className="second-row-widgets">
            {/* On Break Widget */}
            <div className="on-break-widget">
              <Card title="Currently On Break" className="widget-card">
                {dashboardData.onBreakEmployees && dashboardData.onBreakEmployees.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Break Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.onBreakEmployees.slice(0, 8).map((employee, index) => (
                        <tr key={index}>
                          <td>{employee.name || 'Unknown Employee'}</td>
                          <td>{employee.department || 'N/A'}</td>
                          <td>
                            {employee.startTime ? new Date(employee.startTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data">No employees on break</div>
                )}
              </Card>
            </div>

            {/* Attendance Rate Widget */}
            <div className="attendance-rate-widget">
              <div className="rate-card">
                <div className="rate-value">
                  {dashboardData.overview.totalEmployees > 0 
                    ? Math.round((dashboardData.overview.presentToday / dashboardData.overview.totalEmployees) * 100)
                    : 0}%
                </div>
                <div className="rate-description">Attendance Rate</div>
              </div>
            </div>

            {/* Recent Activity Widget */}
            <div className="recent-activity-widget">
              <Card title="Recent Check-ins" className="widget-card">
                {dashboardData.recentActivity && dashboardData.recentActivity.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recentActivity.slice(0, 3).map((activity, index) => (
                        <tr key={index}>
                          <td>
                            {activity.employee?.firstName && activity.employee?.lastName 
                              ? `${activity.employee.firstName} ${activity.employee.lastName}`
                              : activity.employee?.name || 'Unknown Employee'
                            }
                          </td>
                          <td>{activity.employee?.department || 'N/A'}</td>
                          <td className="activity-time">
                            {activity.checkIn ? new Date(activity.checkIn).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }) : 'N/A'}
                            {activity.isLate && <span className="late-badge">Late</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data">No recent activity</div>
                )}
              </Card>
            </div>
          </div>

          {/* Custom Widgets Area - Only show if widgets are configured */}
          {customWidgets.length > 0 && (
            <div className="custom-widgets-area">
              {customWidgets.map((widget, index) => (
                <div key={widget._id} className="custom-widget">
                  <div className="custom-widget-title">{widget.title}</div>
                  <div className="custom-widget-content">
                    {widget.type === 'announcement' && (
                      <div>{widget.description}</div>
                    )}
                    {widget.type === 'metric' && (
                      <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          {widget.data?.value || 'N/A'}
                        </div>
                        <div>{widget.data?.label || ''}</div>
                      </div>
                    )}
                    {widget.type === 'table' && (
                      <div>
                        {widget.data?.rows?.length > 0 ? (
                          <div>
                            {widget.data.rows.slice(0, 3).map((row, idx) => (
                              <div key={idx} style={{ marginBottom: '0.25rem' }}>
                                {row.name || row.title || 'Item'}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>No data available</div>
                        )}
                      </div>
                    )}
                    {widget.type === 'custom' && (
                      <div>{widget.description || 'Custom widget content'}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicLiveDashboard;
