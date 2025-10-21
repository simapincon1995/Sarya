import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { Chart } from 'primereact/chart';
import { useSocket } from '../contexts/SocketContext';
import { attendanceService } from '../services/attendanceService';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const LiveDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const { realtimeData, socketEnabled } = useSocket();

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Refresh every 60 seconds (increased from 30)
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if ((realtimeData.attendance || realtimeData.leaves || realtimeData.dashboard) && socketEnabled) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeData, socketEnabled]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      console.log('Fullscreen change event triggered'); // Debug log
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      console.log('Current fullscreen state:', isCurrentlyFullscreen); // Debug log
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

  const loadDashboardData = async () => {
    const now = Date.now();
    if (now - lastRequestTime < 10000) return; // Min 10 seconds between calls
    setLastRequestTime(now);
    
    try {
      const data = await attendanceService.getDashboardOverview();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limited - will retry later');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFullscreen = async () => {
    console.log('toggleFullscreen called'); // Debug log
    const element = document.documentElement;
    
    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
      console.log('Attempting to enter fullscreen'); // Debug log
      
      try {
        // Try different elements and methods
        let fullscreenPromise = null;
        
        if (element.requestFullscreen) {
          console.log('Using standard requestFullscreen on documentElement'); // Debug log
          fullscreenPromise = element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          console.log('Using webkit requestFullscreen on documentElement'); // Debug log
          fullscreenPromise = Promise.resolve(element.webkitRequestFullscreen());
        } else if (element.mozRequestFullScreen) {
          console.log('Using moz requestFullScreen on documentElement'); // Debug log
          fullscreenPromise = Promise.resolve(element.mozRequestFullScreen());
        } else if (element.msRequestFullscreen) {
          console.log('Using ms requestFullscreen on documentElement'); // Debug log
          fullscreenPromise = Promise.resolve(element.msRequestFullscreen());
        } else {
          // Fallback: try body element
          const bodyElement = document.body;
          if (bodyElement.requestFullscreen) {
            console.log('Using standard requestFullscreen on body'); // Debug log
            fullscreenPromise = bodyElement.requestFullscreen();
          } else if (bodyElement.webkitRequestFullscreen) {
            console.log('Using webkit requestFullscreen on body'); // Debug log
            fullscreenPromise = Promise.resolve(bodyElement.webkitRequestFullscreen());
          } else if (bodyElement.mozRequestFullScreen) {
            console.log('Using moz requestFullScreen on body'); // Debug log
            fullscreenPromise = Promise.resolve(bodyElement.mozRequestFullScreen());
          } else if (bodyElement.msRequestFullscreen) {
            console.log('Using ms requestFullscreen on body'); // Debug log
            fullscreenPromise = Promise.resolve(bodyElement.msRequestFullscreen());
          } else {
            console.log('No fullscreen API available'); // Debug log
            return;
          }
        }
        
        if (fullscreenPromise) {
          await fullscreenPromise;
          console.log('Successfully entered fullscreen'); // Debug log
          setIsFullscreen(true);
        }
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err);
        // Try alternative approach - just set the state and rely on CSS
        console.log('Falling back to CSS-only fullscreen mode');
      setIsFullscreen(true);
      }
    } else {
      console.log('Attempting to exit fullscreen'); // Debug log
      
      try {
        // Exit fullscreen
        if (document.exitFullscreen) {
          console.log('Using standard exitFullscreen'); // Debug log
          await document.exitFullscreen();
          console.log('Successfully exited fullscreen'); // Debug log
          setIsFullscreen(false);
        } else if (document.webkitExitFullscreen) {
          console.log('Using webkit exitFullscreen'); // Debug log
          document.webkitExitFullscreen();
          setIsFullscreen(false);
        } else if (document.mozCancelFullScreen) {
          console.log('Using moz cancelFullScreen'); // Debug log
          document.mozCancelFullScreen();
          setIsFullscreen(false);
        } else if (document.msExitFullscreen) {
          console.log('Using ms exitFullscreen'); // Debug log
          document.msExitFullscreen();
          setIsFullscreen(false);
        }
      } catch (err) {
        console.error('Error attempting to exit fullscreen:', err);
        // Fallback: just set the state
      setIsFullscreen(false);
      }
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSince = (dateString) => {
    const start = new Date(dateString);
    const now = new Date();
    const mins = Math.max(0, Math.floor((now - start) / (1000 * 60)));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
    <div className={`live-dashboard ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header */}
      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Sarya Connective - Live Dashboard
          </h1>
          <p className="text-lg text-color-secondary">
            Real-time employee activity monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            icon="pi pi-refresh"
            className="p-button-outlined"
            onClick={loadDashboardData}
            tooltip="Refresh Data"
          />
          <Button
            icon={isFullscreen ? "pi pi-window-minimize" : "pi pi-window-maximize"}
            className="p-button-outlined"
            onClick={toggleFullscreen}
            tooltip={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid mb-4">
        <div className="col-12 md:col-3">
          <Card className="text-center stat-card-large">
            <div className="stat-value-large text-green-500">
              {dashboardData.overview.checkedIn}
            </div>
            <div className="stat-label-large">Present Today</div>
          </Card>
        </div>
        <div className="col-12 md:col-3">
          <Card className="text-center stat-card-large">
            <div className="stat-value-large text-yellow-500">
              {dashboardData.overview.onBreak}
            </div>
            <div className="stat-label-large">On Break</div>
          </Card>
        </div>
        <div className="col-12 md:col-3">
          <Card className="text-center stat-card-large">
            <div className="stat-value-large text-red-500">
              {dashboardData.overview.absent}
            </div>
            <div className="stat-label-large">Absent</div>
          </Card>
        </div>
        <div className="col-12 md:col-3">
          <Card className="text-center stat-card-large attendance-rate-stat-card">
            <div className="stat-value-large text-primary">
              {Math.round((dashboardData.overview.checkedIn / dashboardData.overview.totalEmployees) * 100)}%
            </div>
            <div className="stat-label-large">Attendance Rate</div>
          </Card>
        </div>
      </div>

      {/* On Break Employees */}
      <div className="grid mb-4">
        <div className="col-12">
          <Card title="Currently On Break">
            {dashboardData.onBreakEmployees && dashboardData.onBreakEmployees.length > 0 ? (
              <div className="grid">
                {dashboardData.onBreakEmployees.map((emp, idx) => (
                  <div key={emp.id || idx} className="col-12 md:col-6 lg:col-3">
                    <div className="border-1 surface-border border-round p-3">
                      <div className="text-sm font-medium mb-1">
                        {emp.name}
                      </div>
                      <div className="text-xs text-color-secondary mb-2">
                        {emp.department}
                      </div>
                      <div className="text-xs mb-1">
                        Break: <strong>{emp.breakType || 'other'}</strong>
                      </div>
                      <div className="text-xs">
                        Since {formatTime(emp.startTime)} ({formatSince(emp.startTime)})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-color-secondary">No one is currently on break</div>
            )}
          </Card>
        </div>
      </div>

      {/* Department Chart */}
      <div className="grid mb-4">
        <div className="col-12 lg:col-8">
          <Card title="Department Attendance" className="h-full">
            <Chart
              type="bar"
              data={{
                labels: Object.keys(dashboardData.departmentStats),
                datasets: [
                  {
                    label: 'Present Employees',
                    data: Object.values(dashboardData.departmentStats).map(dept => dept.present),
                    backgroundColor: '#3B82F6',
                    borderWidth: 0
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
              style={{ height: '300px' }}
            />
          </Card>
        </div>
        <div className="col-12 lg:col-4">
          <Card title="Team Performance" className="h-full">
            <div className="team-charts-container">
              {/* Team 1 Pie Chart */}
              <div className="team-chart">
                <div className="team-chart-title">Team Alpha</div>
                <div className="pie-chart-placeholder">
                  <div className="chart-icon">
                    <i className="pi pi-chart-pie"></i>
                  </div>
                  <div className="chart-text">Team Alpha Data</div>
                  <div className="chart-subtext">Configure via Admin</div>
                </div>
              </div>
              
              {/* Team 2 Pie Chart */}
              <div className="team-chart">
                <div className="team-chart-title">Team Beta</div>
                <div className="pie-chart-placeholder">
                  <div className="chart-icon">
                    <i className="pi pi-chart-pie"></i>
                  </div>
                  <div className="chart-text">Team Beta Data</div>
                  <div className="chart-subtext">Configure via Admin</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="col-12">
        <Card title="Recent Check-ins">
          <div className="grid">
            {dashboardData.recentActivity.slice(0, 8).map((activity, index) => (
              <div key={index} className="col-12 md:col-6 lg:col-3">
                <div className="border-1 surface-border border-round p-3 text-center">
                  <div className="text-sm font-medium mb-1">
                    {activity.employee.firstName} {activity.employee.lastName}
                  </div>
                  <div className="text-xs text-color-secondary mb-2">
                    {activity.employee.department}
                  </div>
                  <div className="text-sm font-bold text-primary">
                    {formatTime(activity.checkIn)}
                  </div>
                  <div className="mt-2">
                    {activity.isLate ? (
                      <Badge value="Late Check-in" severity="danger" />
                    ) : (
                      <Badge value="On Time" severity="success" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center mt-4">
        <p className="text-sm text-color-secondary">
          Last updated: {new Date().toLocaleString()} | 
          Auto-refresh: Every 30 seconds
        </p>
      </div>
    </div>
  );
};

export default LiveDashboard;
