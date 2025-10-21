import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { ProgressBar } from 'primereact/progressbar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Chart } from 'primereact/chart';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { attendanceService } from '../services/attendanceService';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState({});
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const { user } = useAuth();
  const { realtimeData } = useSocket();

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (realtimeData.attendance) {
      // Update dashboard with real-time data
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeData]);

  const loadDashboardData = async () => {
    const now = Date.now();
    if (now - lastRequestTime < 10000) return; // Min 10 seconds between calls
    setLastRequestTime(now);
    
    try {
      setIsLoading(true);
      const data = await attendanceService.getDashboardOverview();
      setDashboardData(data);
      
      // Prepare chart data
      prepareChartData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limited - will retry later');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const prepareChartData = (data) => {
    // Department attendance chart
    const departmentLabels = Object.keys(data.departmentStats);
    const departmentData = departmentLabels.map(dept => data.departmentStats[dept].present);
    
    setChartData({
      departmentChart: {
        labels: departmentLabels,
        datasets: [
          {
            label: 'Present Employees',
            data: departmentData,
            backgroundColor: [
              '#3B82F6',
              '#10B981',
              '#F59E0B',
              '#EF4444',
              '#8B5CF6',
              '#06B6D4'
            ],
            borderWidth: 0
          }
        ]
      }
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'checked-in': { severity: 'success', label: 'Present' },
      'checked-out': { severity: 'info', label: 'Left' },
      'on-break': { severity: 'warning', label: 'On Break' },
      'absent': { severity: 'danger', label: 'Absent' }
    };

    const config = statusConfig[status] || { severity: 'secondary', label: status };
    return <Tag value={config.label} severity={config.severity} />;
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (!dashboardData) {
    return (
      <div className="text-center p-4">
        <p>No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="grid">
      {/* Welcome Card */}
      <div className="col-12">
        <Card className="mb-4">
          <div className="flex align-items-center justify-content-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="text-color-secondary">
                Here's what's happening in your organization today.
              </p>
            </div>
            <Button
              icon="pi pi-refresh"
              className="p-button-outlined"
              onClick={loadDashboardData}
              tooltip="Refresh Data"
            />
          </div>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="col-12 md:col-6 lg:col-3">
        <Card className="stat-card">
          <div className="stat-value">{dashboardData.overview.totalEmployees}</div>
          <div className="stat-label">Total Employees</div>
        </Card>
      </div>

      <div className="col-12 md:col-6 lg:col-3">
        <Card className="stat-card">
          <div className="stat-value text-green-500">{dashboardData.overview.checkedIn}</div>
          <div className="stat-label">Present Today</div>
        </Card>
      </div>

      <div className="col-12 md:col-6 lg:col-3">
        <Card className="stat-card">
          <div className="stat-value text-yellow-500">{dashboardData.overview.onBreak}</div>
          <div className="stat-label">On Break</div>
        </Card>
      </div>

      <div className="col-12 md:col-6 lg:col-3">
        <Card className="stat-card">
          <div className="stat-value text-red-500">{dashboardData.overview.absent}</div>
          <div className="stat-label">Absent</div>
        </Card>
      </div>

      {/* Department Chart */}
      <div className="col-12 lg:col-8">
        <Card title="Department Attendance" className="h-full">
          <Chart
            type="bar"
            data={chartData.departmentChart}
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

      {/* Attendance Summary */}
      <div className="col-12 lg:col-4">
        <Card title="Today's Summary" className="h-full">
          <div className="flex flex-column gap-4">
            <div>
              <div className="flex justify-content-between mb-2">
                <span className="text-sm font-medium">Attendance Rate</span>
                <span className="text-sm">
                  {Math.round((dashboardData.overview.checkedIn / dashboardData.overview.totalEmployees) * 100)}%
                </span>
              </div>
              <ProgressBar
                value={(dashboardData.overview.checkedIn / dashboardData.overview.totalEmployees) * 100}
                showValue={false}
                style={{ height: '8px' }}
              />
            </div>

            <div>
              <div className="flex justify-content-between mb-2">
                <span className="text-sm font-medium">Late Arrivals</span>
                <span className="text-sm">{dashboardData.overview.late}</span>
              </div>
              <ProgressBar
                value={(dashboardData.overview.late / dashboardData.overview.checkedIn) * 100}
                showValue={false}
                style={{ height: '8px' }}
              />
            </div>

            <div className="border-top-1 surface-border pt-3">
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-sm font-medium">Pending Leaves</span>
                <Badge value={dashboardData.pendingLeaves} severity="warning" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="col-12">
        <Card title="Recent Check-ins">
          <DataTable
            value={dashboardData.recentActivity}
            paginator
            rows={5}
            emptyMessage="No recent activity"
            className="p-datatable-sm"
          >
            <Column
              field="employee.firstName"
              header="Employee"
              body={(rowData) => (
                <div className="flex align-items-center gap-2">
                  <i className="pi pi-user text-color-secondary"></i>
                  <span>{rowData.employee.firstName} {rowData.employee.lastName}</span>
                </div>
              )}
            />
            <Column
              field="employee.department"
              header="Department"
            />
            <Column
              field="checkIn"
              header="Check-in Time"
              body={(rowData) => formatTime(rowData.checkIn)}
            />
            <Column
              field="isLate"
              header="Status"
              body={(rowData) => (
                <div className="flex align-items-center gap-2">
                  {getStatusBadge(rowData.isLate ? 'late' : 'checked-in')}
                  {rowData.isLate && (
                    <i className="pi pi-exclamation-triangle text-yellow-500" title="Late arrival"></i>
                  )}
                </div>
              )}
            />
          </DataTable>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
