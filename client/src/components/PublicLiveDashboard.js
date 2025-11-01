import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Chart } from 'primereact/chart';
import { useSocket } from '../contexts/SocketContext';
import { attendanceService } from '../services/attendanceService';
import { dashboardService } from '../services/dashboardService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './PublicLiveDashboard.css';

const PublicLiveDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [performerOfDay, setPerformerOfDay] = useState(null);
  const [customWidgets, setCustomWidgets] = useState([]);
  const [teamData, setTeamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
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
      console.log('Performer response:', response); // Debug log
      // Only set performer if widget exists and has performerData with performers array
      if (response.widget && response.widget.performerData && response.widget.performerData.performers && response.widget.performerData.performers.length > 0) {
        console.log('Setting performer data:', response.widget.performerData); // Debug log
        setPerformerOfDay(response.widget);
      } else {
        console.log('No valid performer data found'); // Debug log
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

  const loadTeamData = useCallback(async () => {
    if (!throttleRequest('team', 10000)) return; // Min 10 seconds between team data calls
    
    try {
      const response = await dashboardService.getTeamData();
      console.log('Team data response:', response); // Debug log
      if (response.widget && response.widget.teamData) {
        setTeamData(response.widget.teamData);
      } else {
        setTeamData(null);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      setTeamData(null);
    }
  }, [throttleRequest]);

  const loadCustomWidgets = useCallback(async () => {
    if (!throttleRequest('widgets', 20000)) return; // Min 20 seconds between widget calls
    
    try {
      const response = await dashboardService.getPublicDashboardWidgets();
      // Filter out performer of day, team data widgets and limit to 3 custom widgets
      const customWidgets = response.widgets
        .filter(widget => 
          widget.name !== 'performer-of-day' && 
          widget.type !== 'team-donut-chart' && 
          widget.type !== 'team-data' &&
          widget.isVisible && 
          widget.isPublic
        )
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
    loadTeamData();
    loadCustomWidgets();
    const interval = setInterval(() => {
      loadDashboardData();
      loadPerformerOfDay();
      loadTeamData();
      loadCustomWidgets();
    }, 60000); // Refresh every 60 seconds (increased from 30 seconds)
    return () => clearInterval(interval);
  }, [loadDashboardData, loadPerformerOfDay, loadTeamData, loadCustomWidgets]);

  useEffect(() => {
    if (realtimeData.attendance || realtimeData.leaves || realtimeData.dashboard) {
      loadDashboardData();
    }
  }, [realtimeData, loadDashboardData]);

  // Update current time every 30 seconds to refresh break durations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds for smoother duration updates
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = async () => {
    console.log('PublicLiveDashboard: toggleFullscreen called'); // Debug log
    const element = document.documentElement;
    
    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
      console.log('PublicLiveDashboard: Attempting to enter fullscreen'); // Debug log
      
      try {
        // Try different elements and methods
        let fullscreenPromise = null;
        
        if (element.requestFullscreen) {
          console.log('PublicLiveDashboard: Using standard requestFullscreen on documentElement'); // Debug log
          fullscreenPromise = element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          console.log('PublicLiveDashboard: Using webkit requestFullscreen on documentElement'); // Debug log
          fullscreenPromise = Promise.resolve(element.webkitRequestFullscreen());
        } else if (element.mozRequestFullScreen) {
          console.log('PublicLiveDashboard: Using moz requestFullScreen on documentElement'); // Debug log
          fullscreenPromise = Promise.resolve(element.mozRequestFullScreen());
        } else if (element.msRequestFullscreen) {
          console.log('PublicLiveDashboard: Using ms requestFullscreen on documentElement'); // Debug log
          fullscreenPromise = Promise.resolve(element.msRequestFullscreen());
        } else {
          // Fallback: try body element
          const bodyElement = document.body;
          if (bodyElement.requestFullscreen) {
            console.log('PublicLiveDashboard: Using standard requestFullscreen on body'); // Debug log
            fullscreenPromise = bodyElement.requestFullscreen();
          } else if (bodyElement.webkitRequestFullscreen) {
            console.log('PublicLiveDashboard: Using webkit requestFullscreen on body'); // Debug log
            fullscreenPromise = Promise.resolve(bodyElement.webkitRequestFullscreen());
          } else if (bodyElement.mozRequestFullScreen) {
            console.log('PublicLiveDashboard: Using moz requestFullScreen on body'); // Debug log
            fullscreenPromise = Promise.resolve(bodyElement.mozRequestFullScreen());
          } else if (bodyElement.msRequestFullscreen) {
            console.log('PublicLiveDashboard: Using ms requestFullscreen on body'); // Debug log
            fullscreenPromise = Promise.resolve(bodyElement.msRequestFullscreen());
          } else {
            console.log('PublicLiveDashboard: No fullscreen API available'); // Debug log
            return;
          }
        }
        
        if (fullscreenPromise) {
          await fullscreenPromise;
          console.log('PublicLiveDashboard: Successfully entered fullscreen'); // Debug log
          setIsFullscreen(true);
        }
      } catch (err) {
        console.error('PublicLiveDashboard: Error attempting to enable fullscreen:', err);
        // Try alternative approach - just set the state and rely on CSS
        console.log('PublicLiveDashboard: Falling back to CSS-only fullscreen mode');
        setIsFullscreen(true);
      }
    } else {
      console.log('PublicLiveDashboard: Attempting to exit fullscreen'); // Debug log
      
      try {
        // Exit fullscreen
        if (document.exitFullscreen) {
          console.log('PublicLiveDashboard: Using standard exitFullscreen'); // Debug log
          await document.exitFullscreen();
          console.log('PublicLiveDashboard: Successfully exited fullscreen'); // Debug log
          setIsFullscreen(false);
        } else if (document.webkitExitFullscreen) {
          console.log('PublicLiveDashboard: Using webkit exitFullscreen'); // Debug log
          document.webkitExitFullscreen();
          setIsFullscreen(false);
        } else if (document.mozCancelFullScreen) {
          console.log('PublicLiveDashboard: Using moz cancelFullScreen'); // Debug log
          document.mozCancelFullScreen();
          setIsFullscreen(false);
        } else if (document.msExitFullscreen) {
          console.log('PublicLiveDashboard: Using ms exitFullscreen'); // Debug log
          document.msExitFullscreen();
          setIsFullscreen(false);
        }
      } catch (err) {
        console.error('PublicLiveDashboard: Error attempting to exit fullscreen:', err);
        // Fallback: just set the state
        setIsFullscreen(false);
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      console.log('PublicLiveDashboard: Fullscreen change event triggered'); // Debug log
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      console.log('PublicLiveDashboard: Current fullscreen state:', isCurrentlyFullscreen); // Debug log
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Loading live dashboard..." />;
  }

  // Chart configuration for team performance
  const getTeamChartData = () => {
    if (!teamData) return null;
    
    return {
      labels: [teamData.teamAlpha?.name || 'Team Alpha', teamData.teamBeta?.name || 'Team Beta'],
      datasets: [{
        data: [
          teamData.teamAlpha?.actualCalls || 0,
          teamData.teamBeta?.actualCalls || 0
        ],
        backgroundColor: ['#4CAF50', '#2196F3'],
        borderColor: ['#4CAF50', '#2196F3'],
        borderWidth: 2
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#666666',
          font: {
            size: 12
          }
        }
      }
    },
    cutout: '60%'
  };

  // Helper function to calculate break duration
  const calculateBreakDuration = (startTime) => {
    if (!startTime) return 'N/A';
    
    const start = new Date(startTime);
    const now = currentTime;
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

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
                  <div className="performer-stat-title">Today's Performers</div>
                  <div className="performers-list">
                    {performerOfDay.performerData.performers.slice(-3).map((performer, index) => (
                      <div key={index}>
                        {performer.name}
                      </div>
                    ))}
                    {performerOfDay.performerData.performers.length > 3 && (
                      <div className="more-performers-indicator">
                        +{performerOfDay.performerData.performers.length - 3} more
                      </div>
                    )}
                  </div>
           
                </div>
              </Card>
            ) : (
              <Card className="stat-card">
                <div className="stat-icon">
                  <i className="pi pi-star" style={{ color: '#666' }}></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value" style={{ fontSize: '1.2rem', color: '#666' }}>No Performers</div>
                  <div className="stat-label">Performers of the Day</div>
                  <div className="stat-comparison">
                    <i className="pi pi-info-circle"></i>
                    Not Set
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Second Row - On Break, Team Pie Charts, Recent Activity */}
          <div className="second-row-widgets">
            {/* On Break Widget */}
            <div className="on-break-widget">
              <Card title="Currently On Break" className="widget-card">
                {dashboardData.onBreakEmployees && dashboardData.onBreakEmployees.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Break Time</th>
                        <th>Total Break Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.onBreakEmployees.slice(0, 8).map((employee, index) => (
                        <tr key={index}>
                          <td>{employee.name || 'Unknown Employee'}</td>
                          <td>
                            {employee.startTime ? new Date(employee.startTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }) : 'N/A'}
                          </td>
                          <td>
                            {calculateBreakDuration(employee.startTime)}
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

            {/* Team Performance Widget */}
            <div className="team-performance-widget">
              <Card title="Team Performance" className="widget-card">
                {teamData ? (
                  <div className="team-chart-container">
                    <Chart 
                      type="doughnut" 
                      data={getTeamChartData()} 
                      options={chartOptions}
                      style={{ height: '200px', marginTop: '3rem' }}
                    />
                    <div className="team-stats">
                      <div className="team-stat">
                        <div className="team-stat-label">{teamData.teamAlpha?.name || 'Team Alpha'}</div>
                        <div className="team-stat-value">
                          {teamData.teamAlpha?.actualCalls || 0} / {teamData.teamAlpha?.expectedCalls || 0}
                        </div>
                        <div className="team-stat-subtext">Actual / Expected Calls</div>
                      </div>
                      <div className="team-stat">
                        <div className="team-stat-label">{teamData.teamBeta?.name || 'Team Beta'}</div>
                        <div className="team-stat-value">
                          {teamData.teamBeta?.actualCalls || 0} / {teamData.teamBeta?.expectedCalls || 0}
                        </div>
                        <div className="team-stat-subtext">Actual / Expected Calls</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-team-data">
                    <div className="no-data-icon">
                      <i className="pi pi-chart-pie"></i>
                    </div>
                    <div className="no-data-text">Team Performance Data</div>
                    <div className="no-data-subtext">Configure via Admin</div>
                  </div>
                )}
              </Card>
            </div>

            {/* Recent Activity Widget */}
            <div className="recent-activity-widget">
              <Card title="Recent Check-ins" className="widget-card">
                {dashboardData.recentActivity && dashboardData.recentActivity.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recentActivity.slice(0, 4).map((activity, index) => (
                        <tr key={index}>
                          <td>
                            {activity.employee?.firstName && activity.employee?.lastName 
                              ? `${activity.employee.firstName} ${activity.employee.lastName}`
                              : activity.employee?.name || 'Unknown Employee'
                            }
                          </td>
                          <td className="activity-time">
                            {activity.checkIn ? new Date(activity.checkIn).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }) : 'N/A'}
                          </td>
                          <td>
                            {activity.isLate ? (
                              <span className="late-status-badge">Late Check-in</span>
                            ) : (
                              <span className="ontime-status-badge">On Time</span>
                            )}
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
                    {widget.type === 'team-pie-chart' && (
                      <div className="team-pie-chart-widget-content">
                        <div className="team-charts-container">
                          {/* Team 1 Pie Chart */}
                          <div className="team-chart">
                            <div className="team-chart-title">{widget.data?.team1Name || 'Team Alpha'}</div>
                            <div className="pie-chart-placeholder">
                              <div className="chart-icon">
                                <i className="pi pi-chart-pie"></i>
                              </div>
                              <div className="chart-text">
                                {widget.data?.team1Data?.present || 0} Present
                              </div>
                              <div className="chart-subtext">
                                {widget.data?.team1Data?.total || 0} Total
                              </div>
                            </div>
                          </div>
                          
                          {/* Team 2 Pie Chart */}
                          <div className="team-chart">
                            <div className="team-chart-title">{widget.data?.team2Name || 'Team Beta'}</div>
                            <div className="pie-chart-placeholder">
                              <div className="chart-icon">
                                <i className="pi pi-chart-pie"></i>
                              </div>
                              <div className="chart-text">
                                {widget.data?.team2Data?.present || 0} Present
                              </div>
                              <div className="chart-subtext">
                                {widget.data?.team2Data?.total || 0} Total
                              </div>
                            </div>
                          </div>
                        </div>
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
