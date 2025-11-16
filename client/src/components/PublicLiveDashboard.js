import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { useSocket } from '../contexts/SocketContext';
import { attendanceService } from '../services/attendanceService';
import { dashboardService } from '../services/dashboardService';
import { organizationService } from '../services/organizationService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './PublicLiveDashboard.css';

const PublicLiveDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [, setPerformerOfDay] = useState(null);
  const [customWidgets, setCustomWidgets] = useState([]);
  const [teamData, setTeamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [orgTimezone, setOrgTimezone] = useState('America/New_York');
  const [timeFormat, setTimeFormat] = useState('hh:mm A');
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
      const response = await dashboardService.getPublicTeams();
      console.log('Teams response:', response); // Debug log
      if (response.widget && response.widget.teams && response.widget.teams.length > 0) {
        setTeamData(response.widget.teams);
      } else {
        setTeamData(null);
      }
    } catch (error) {
      console.error('Error loading teams data:', error);
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

  // Load organization timezone settings
  useEffect(() => {
    const loadOrgSettings = async () => {
      try {
        const settings = await organizationService.getPublicSettings();
        if (settings) {
          setOrgTimezone(settings.timezone || 'America/New_York');
          setTimeFormat(settings.timeFormat || 'hh:mm A');
        }
      } catch (error) {
        console.error('Failed to load organization settings:', error);
      }
    };
    loadOrgSettings();
  }, []);

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

  // Helper function to calculate total break duration for the day
  const calculateBreakDuration = (employee) => {
    if (!employee) return 'N/A';
    
    let totalMins = 0;
    
    // If we have all breaks, calculate from all breaks for accurate real-time updates
    if (employee.allBreaks && Array.isArray(employee.allBreaks)) {
      employee.allBreaks.forEach(breakItem => {
        if (breakItem.endTime) {
          // Completed break - use duration if available, otherwise calculate
          if (breakItem.duration) {
            totalMins += breakItem.duration;
          } else {
            const start = new Date(breakItem.startTime);
            const end = new Date(breakItem.endTime);
            totalMins += Math.floor((end - start) / (1000 * 60));
          }
        } else if (breakItem.isActive && breakItem.startTime) {
          // Active break - calculate duration from start to current time
          const start = new Date(breakItem.startTime);
          const now = currentTime;
          totalMins += Math.floor((now - start) / (1000 * 60));
        }
      });
    } else if (employee.totalBreakDurationMs !== undefined && employee.startTime) {
      // Use backend calculation as base, but update active break to current time
      // Backend calculation includes active break up to request time
      // We need to update it to current time for real-time display
      // Estimate what backend calculated (assume it was calculated at request time)
      // We'll use totalBreakDurationMs as base and adjust the active portion
      // For simplicity, recalculate completed breaks + current active break
      // Since we don't have allBreaks, use the backend total and just update active portion
      totalMins = employee.totalBreakDurationMs;
      // The backend already included the active break up to its calculation time
      // For real-time updates, we'd need the exact backend calculation time, but
      // since we update currentTime every 30 seconds, the difference should be minimal
    } else if (employee.startTime) {
      // Fallback: if we only have startTime, calculate from startTime to now
      // This shouldn't happen with the updated backend, but keeping for compatibility
      const start = new Date(employee.startTime);
      const now = currentTime;
      totalMins = Math.floor((now - start) / (1000 * 60));
    }
    
    if (totalMins < 60) {
      return `${totalMins}m`;
    } else {
      const hours = Math.floor(totalMins / 60);
      const minutes = totalMins % 60;
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
            
            {/* Performer of the Day Card - Single card with two teams side by side */}
            {teamData && Array.isArray(teamData) && teamData.filter(team => 
              team.performers && team.performers.length > 0
            ).length > 0 ? (
              <Card className="performer-stat-card teams-performers-card">
                <div className="performer-stat-icon">
                  <i className="pi pi-trophy" style={{ color: '#2C2C2C' }}></i>
                </div>
                <div className="performer-stat-content">
                  <div className="performer-stat-title">Performer of the Day</div>
                  <div className="teams-performers-container">
                    {teamData
                      .filter(team => team.performers && team.performers.length > 0)
                      .map((team, index) => (
                        <div key={team.teamId || index} className="team-performer-card">
                          <div className="team-name-header">{team.name}</div>
                          <div className="team-green-line"></div>
                          <div className="performers-of-day-section">
                            <div className="performers-vertical-line"></div>
                            <div className="team-performers-list">
                              {team.performers.slice(0, 3).map((performer, pIdx) => (
                                <div key={pIdx} className="performer-pill-button">
                                  {performer.name}
                                </div>
                              ))}
                              {team.performers.length > 3 && (
                                <div className="performer-pill-button performer-count-indicator">
                                  +{team.performers.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
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
                  <div className="stat-label">Performer of the Day</div>
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
                              hour12: timeFormat === 'hh:mm A',
                              timeZone: orgTimezone
                            }) : 'N/A'}
                          </td>
                          <td>
                            {calculateBreakDuration(employee)}
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

            {/* Teams Performance Widget */}
            <div className="team-performance-widget">
              <Card title="Teams Performance" className="widget-card">
                {teamData && Array.isArray(teamData) && teamData.length > 0 ? (
                  <div className="teams-display-container">
                    {teamData.map((team, index) => (
                      <div key={team.teamId || index} className="team-display-card">
                        <div className="team-display-header">
                          <h4>{team.name}</h4>
                        </div>
                        <div className="team-display-content">
                          {/* Calls */}
                          {(team.fieldVisibility?.expectedCalls || team.fieldVisibility?.actualCalls) && (
                            <div className="team-metric">
                              <div className="metric-label">Calls</div>
                              <div className="metric-value">
                                {team.fieldVisibility?.actualCalls !== false && (team.actualCalls || 0)}
                                {team.fieldVisibility?.expectedCalls !== false && (
                                  <span> / {team.expectedCalls || 0}</span>
                                )}
                                {team.fieldVisibility?.expectedCalls === false && (
                                  <span className="metric-suffix"> (Actual)</span>
                                )}
                              </div>
                              {team.fieldVisibility?.expectedCalls !== false && (
                                <div className="metric-subtext">Actual / Expected</div>
                              )}
                            </div>
                          )}
                          
                          {/* Candidates */}
                          {(team.fieldVisibility?.expectedCandidates || team.fieldVisibility?.actualCandidates) && (
                            <div className="team-metric">
                              <div className="metric-label">Candidates</div>
                              <div className="metric-value">
                                {team.fieldVisibility?.actualCandidates !== false && (team.actualCandidates || 0)}
                                {team.fieldVisibility?.expectedCandidates !== false && (
                                  <span> / {team.expectedCandidates || 0}</span>
                                )}
                                {team.fieldVisibility?.expectedCandidates === false && (
                                  <span className="metric-suffix"> (Actual)</span>
                                )}
                              </div>
                              {team.fieldVisibility?.expectedCandidates !== false && (
                                <div className="metric-subtext">Actual / Expected</div>
                              )}
                            </div>
                          )}
                          
                          {/* Call Duration */}
                          {(team.fieldVisibility?.expectedCallDuration || team.fieldVisibility?.actualCallDuration) && (
                            <div className="team-metric">
                              <div className="metric-label">Call Duration (min)</div>
                              <div className="metric-value">
                                {team.fieldVisibility?.actualCallDuration !== false && (team.actualCallDuration || 0)}
                                {team.fieldVisibility?.expectedCallDuration !== false && (
                                  <span> / {team.expectedCallDuration || 0}</span>
                                )}
                                {team.fieldVisibility?.expectedCallDuration === false && (
                                  <span className="metric-suffix"> (Actual)</span>
                                )}
                              </div>
                              {team.fieldVisibility?.expectedCallDuration !== false && (
                                <div className="metric-subtext">Actual / Expected</div>
                              )}
                            </div>
                          )}
                          
                          {/* Job Applications */}
                          {(team.fieldVisibility?.expectedJobApplications || team.fieldVisibility?.actualJobApplications) && (
                            <div className="team-metric">
                              <div className="metric-label">Job Applications</div>
                              <div className="metric-value">
                                {team.fieldVisibility?.actualJobApplications !== false && (team.actualJobApplications || 0)}
                                {team.fieldVisibility?.expectedJobApplications !== false && (
                                  <span> / {team.expectedJobApplications || 0}</span>
                                )}
                                {team.fieldVisibility?.expectedJobApplications === false && (
                                  <span className="metric-suffix"> (Actual)</span>
                                )}
                              </div>
                              {team.fieldVisibility?.expectedJobApplications !== false && (
                                <div className="metric-subtext">Actual / Expected</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-team-data">
                    <div className="no-data-icon">
                      <i className="pi pi-chart-pie"></i>
                    </div>
                    <div className="no-data-text">Teams Performance Data</div>
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
                              hour12: timeFormat === 'hh:mm A',
                              timeZone: orgTimezone
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
