import React from 'react';
import { Card } from 'primereact/card';
import { ProgressBar } from 'primereact/progressbar';
import { Tag } from 'primereact/tag';
import './QuickStats.css';

const QuickStats = ({ attendanceStatus }) => {
  const calculateWorkProgress = () => {
    if (!attendanceStatus?.totalWorkingHours && !attendanceStatus?.attendance) return 0;
    const totalWorking = attendanceStatus?.totalWorkingHours ?? attendanceStatus?.attendance?.totalWorkingHours ?? 0;
    const standardWorkDay = 8 * 60; // 8 hours in minutes
    return Math.min((totalWorking / standardWorkDay) * 100, 100);
  };

  const calculateBreakProgress = () => {
    if (!attendanceStatus?.totalBreakTime && !attendanceStatus?.attendance) return 0;
    const totalBreak = attendanceStatus?.totalBreakTime ?? attendanceStatus?.attendance?.totalBreakTime ?? 0;
    const maxBreakTime = 60; // 1 hour in minutes
    return Math.min((totalBreak / maxBreakTime) * 100, 100);
  };

  const totalLoginMinutes = attendanceStatus?.totalLoginMinutes ?? 0;
  const loginHoursText = totalLoginMinutes ? `${Math.floor(totalLoginMinutes / 60)}h ${totalLoginMinutes % 60}m` : '0h 0m';

  const getStatusSeverity = (status) => {
    switch (status) {
      case 'checked-in':
      case 'present':
        return 'success';
      case 'on-break':
        return 'warning';
      case 'checked-out':
        return 'info';
      case 'not-checked-in':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const stats = [
    {
      icon: 'pi pi-user-clock',
      title: 'Login Hours',
      value: loginHoursText,
      progress: Math.min((totalLoginMinutes / (8 * 60)) * 100, 100),
      color: 'info',
      target: '8h 0m'
    },
    {
      icon: 'pi pi-clock',
      title: 'Work Hours',
      value: (() => {
        const totalWorking = attendanceStatus?.totalWorkingHours ?? attendanceStatus?.attendance?.totalWorkingHours ?? 0;
        return totalWorking ? `${Math.floor(totalWorking / 60)}h ${totalWorking % 60}m` : '0h 0m';
      })(),
      progress: calculateWorkProgress(),
      color: 'primary',
      target: '8h 0m'
    },
    {
      icon: 'pi pi-pause',
      title: 'Break Time',
      value: (() => {
        const totalBreak = attendanceStatus?.totalBreakTime ?? attendanceStatus?.attendance?.totalBreakTime ?? 0;
        return totalBreak ? `${Math.floor(totalBreak / 60)}h ${totalBreak % 60}m` : '0h 0m';
      })(),
      progress: calculateBreakProgress(),
      color: 'warning',
      target: '1h 0m'
    },
    {
      icon: 'pi pi-user',
      title: 'Status',
      value: (() => {
        const status = attendanceStatus?.status;
        switch (status) {
          case 'checked-in': return 'Checked In';
          case 'on-break': return 'On Break';
          case 'checked-out': return 'Checked Out';
          case 'not-checked-in': return 'Not Checked In';
          default: return 'Not Checked In';
        }
      })(),
      tag: true,
      severity: getStatusSeverity(attendanceStatus?.status),
      color: 'info'
    }
  ];

  return (
    <div className="quick-stats">
      {stats.map((stat, index) => (
        <Card key={index} className="stat-card">
          <div className="stat-content">
            <div className={`stat-icon ${stat.color}`}>
              <i className={stat.icon}></i>
            </div>
            <div className="stat-details">
              <h4>{stat.title}</h4>
              {stat.tag ? (
                <Tag 
                  value={stat.value} 
                  severity={stat.severity}
                  className="stat-tag"
                />
              ) : (
                <div className="stat-value">{stat.value}</div>
              )}
              {stat.progress !== undefined && (
                <div className="stat-progress-container">
                  <ProgressBar 
                    value={stat.progress} 
                    showValue={false}
                    className={`stat-progress ${stat.color}`}
                  />
                  <span className="stat-target">Target: {stat.target}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default QuickStats;