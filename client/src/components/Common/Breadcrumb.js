import React from 'react';
import { useLocation } from 'react-router-dom';
import { BreadCrumb } from 'primereact/breadcrumb';

const CustomBreadcrumb = () => {
  const location = useLocation();
  
  const getBreadcrumbItems = () => {
    const pathSegments = location.pathname.split('/').filter(segment => segment !== '');
    const items = [];
    
    // Always start with Dashboard
    items.push({
      label: 'Dashboard',
      url: '/dashboard'
    });
    
    // Map path segments to readable labels
    const pathLabels = {
      'employees': 'Employees',
      'attendance': 'Attendance',
      'attendance-history': 'Attendance History',
      'leaves': 'Leaves',
      'payroll': 'Payroll',
      'templates': 'Templates',
      'holidays': 'Holidays',
      'live-dashboard': 'Live Dashboard',
      'settings': 'Settings',
      'profile': 'Profile'
    };
    
    // Build breadcrumb items
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Don't make the last item clickable
      if (index === pathSegments.length - 1) {
        items.push({
          label: label
        });
      } else {
        items.push({
          label: label,
          url: currentPath
        });
      }
    });
    
    return items;
  };

  const items = getBreadcrumbItems();
  
  // Don't show breadcrumb on dashboard page
  if (location.pathname === '/dashboard' || location.pathname === '/') {
    return null;
  }

  return (
    <div className="breadcrumb-container">
      <BreadCrumb 
        model={items} 
        home={{ 
          icon: 'pi pi-home', 
          url: '/dashboard',
          label: 'Dashboard'
        }}
        className="custom-breadcrumb"
      />
    </div>
  );
};

export default CustomBreadcrumb;
