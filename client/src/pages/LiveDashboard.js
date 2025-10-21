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
  const { realtimeData } = useSocket();

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (realtimeData.attendance || realtimeData.leaves || realtimeData.dashboard) {
      loadDashboardData();
    }
  }, [realtimeData]);

  const loadDashboardData = async () => {
    try {
      const data = await attendanceService.getDashboardOverview();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
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
            <div className="stat-value-large text-primary">
              {dashboardData.overview.totalEmployees}
            </div>
            <div className="stat-label-large">Total Employees</div>
          </Card>
        </div>
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
          <Card title="Attendance Rate" className="h-full">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {Math.round((dashboardData.overview.checkedIn / dashboardData.overview.totalEmployees) * 100)}%
              </div>
              <p className="text-color-secondary">
                {dashboardData.overview.checkedIn} of {dashboardData.overview.totalEmployees} employees present
              </p>
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
                  {activity.isLate && (
                    <Badge value="Late" severity="warning" className="mt-2" />
                  )}
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
