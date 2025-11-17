/* eslint-disable no-unused-vars */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'primereact/menu';
import { useAuth } from '../../contexts/AuthContext';

const SidebarMenu = ({ collapsed, onMenuItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole, hasPermission } = useAuth();

  const handleMenuClick = (path) => {
    navigate(path);
    if (onMenuItemClick) onMenuItemClick();
  };

  const getMenuItems = () => {
    const items = [
      {
        label: 'Live Dashboard',
        icon: 'pi pi-desktop',
        command: () => handleMenuClick('/live-dashboard'),
        className: location.pathname === '/live-dashboard' ? 'active' : '',
        title: 'Live Dashboard'
      }
      
    ];

    // Employee Management (Admin, HR Admin, Manager, Employee)
    if (hasPermission('manage_employees') || hasPermission('view_own_data') || hasRole(['admin', 'hr_admin', 'manager', 'employee'])) {
      items.push({
        label: 'Employees',
        icon: 'pi pi-users',
        command: () => handleMenuClick('/employees'),
        className: location.pathname === '/employees' ? 'active' : '',
        title: 'Employees'
      });
    }

    // Attendance (Admin, HR Admin, Manager, Employee)
    if (hasPermission('mark_attendance') || hasPermission('view_team_reports') || hasPermission('manage_attendance') || hasRole(['admin', 'hr_admin', 'manager', 'employee'])) {
      // Attendance History
      items.push({
        label: 'Attendance History',
        icon: 'pi pi-history',
        command: () => handleMenuClick('/attendance-history'),
        className: location.pathname === '/attendance-history' ? 'active' : '',
        title: 'Attendance History'
      });
    }

    // Leave Management (Admin, HR Admin, Manager, Employee)
    if (hasPermission('apply_leaves') || hasPermission('approve_leaves') || hasPermission('manage_leaves') || hasRole(['admin', 'hr_admin', 'manager', 'employee'])) {
      items.push({
        label: 'Leaves',
        icon: 'pi pi-calendar',
        command: () => handleMenuClick('/leaves'),
        className: location.pathname === '/leaves' ? 'active' : '',
        title: 'Leaves'
      });
    }

    // Payroll (Admin, HR Admin only)
    if (hasPermission('manage_payroll') || hasRole(['admin', 'hr_admin'])) {
      items.push({
        label: 'Payroll',
        icon: 'pi pi-dollar',
        command: () => handleMenuClick('/payroll'),
        className: location.pathname === '/payroll' ? 'active' : '',
        title: 'Payroll'
      });
    }

    // Templates (Admin, HR Admin only)
    if (hasPermission('manage_templates') || hasRole(['admin', 'hr_admin'])) {
      items.push({
        label: 'Templates',
        icon: 'pi pi-file-edit',
        command: () => handleMenuClick('/templates'),
        className: location.pathname === '/templates' ? 'active' : '',
        title: 'Templates'
      });
    }

    // Holidays (Admin, HR Admin, Manager, Employee)
    if (hasPermission('manage_holidays') || hasPermission('view_own_data') || hasRole(['admin', 'hr_admin', 'manager', 'employee'])) {
      items.push({
        label: 'Holidays',
        icon: 'pi pi-calendar-plus',
        command: () => handleMenuClick('/holidays'),
        className: location.pathname === '/holidays' ? 'active' : '',
        title: 'Holidays'
      });
    }

    // Live Dashboard
  

    // Dashboard Widget Management (Admin, HR Admin, Manager only)
    if (hasPermission('manage_dashboard') || hasRole('admin') || hasRole('hr_admin') || hasRole('manager')) {
      items.push({
        label: 'Dashboard Widgets',
        icon: 'pi pi-cog',
        command: () => handleMenuClick('/dashboard-widgets'),
        className: location.pathname === '/dashboard-widgets' ? 'active' : '',
        title: 'Dashboard Widget Management'
      });
      items.push({
        label: 'Dashboard',
        icon: 'pi pi-home',
        command: () => handleMenuClick('/dashboard'),
        className: location.pathname === '/dashboard' ? 'active' : '',
        title: 'Dashboard'
      });
      items.push({
        label: 'Settings',
        icon: 'pi pi-cog',
        command: () => handleMenuClick('/settings'),
        className: location.pathname === '/settings' ? 'active' : '',
        title: 'Settings'
      });
    }

    // Settings


    return items;
  };

  return (
    <div className="flex flex-column h-full">      
      <div className="flex-1 overflow-auto">
        <Menu
          model={getMenuItems()}
          className="w-full border-none"
        />
      </div>

   
    </div>
  );
};

export default SidebarMenu;
