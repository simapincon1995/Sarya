/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import React, { useState, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { Avatar } from 'primereact/avatar';
import { Menu } from 'primereact/menu';
import { InputText } from 'primereact/inputtext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSocket } from '../../contexts/SocketContext';
import SidebarMenu from './SidebarMenu';
import CustomBreadcrumb from '../Common/Breadcrumb';
import './Layout.css';

const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth() || {};
  const { currentTheme, changeTheme, themes } = useTheme() || {};
  const { isConnected } = useSocket() || {};
  const navigate = useNavigate();

  const userMenuRef = useRef(null);
  const themeMenuRef = useRef(null);

  const userMenuItems = [
    {
      label: 'Profile',
      icon: 'pi pi-user',
      command: () => {
        try {
          navigate('/profile');
        } catch (error) {
          console.error('Navigation error:', error);
        }
      }
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      command: () => {
        try {
          navigate('/settings');
        } catch (error) {
          console.error('Navigation error:', error);
        }
      }
    },
    {
      separator: true
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => {
        try {
          if (logout) {
            logout();
          }
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
    }
  ];

  const handleNotificationClick = () => {
    console.log('Notifications clicked');
    // Add notification logic here
    alert('Notifications feature coming soon!');
  };

  const themeMenuItems = themes?.map(theme => ({
    label: theme.name || theme.label,
    command: () => changeTheme(theme.value || theme.key)
  })) || [
    {
      label: 'Light Theme',
      command: () => console.log('Light theme selected')
    },
    {
      label: 'Dark Theme', 
      command: () => console.log('Dark theme selected')
    }
  ];

  return (
    <div className="admin-layout">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Fixed Sidebar */}
      <div className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Logo Section */}
        <div className="sidebar-header">
          <div className="logo-container">
            <img 
              src="/assets/logo.jfif" 
              alt="Company Logo" 
              className="company-logo"
            />
            {!sidebarCollapsed && <span className="logo-text">Sarya</span>}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="sidebar-content">
          <SidebarMenu collapsed={sidebarCollapsed} />
        </div>

        {/* Collapse Button at Bottom */}
        {/* <div className="sidebar-footer">
          <Button
            icon={sidebarCollapsed ? "pi pi-angle-right" : "pi pi-angle-left"}
            className="p-button-text p-button-plain sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            tooltip={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          />
        </div> */}
      </div>

      {/* Main Content Area */}
      <div className={`admin-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top Navigation Bar */}
        <div className="admin-topbar">
          <div className="topbar-left">
            <Button
              icon="pi pi-bars"
              className="p-button-text p-button-plain mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              tooltip="Toggle Menu"
            />
            
            {/* <div className="search-container">
              <i className="pi pi-search search-icon"></i>
              <InputText 
                placeholder="Search..." 
                className="search-input"
              />
            </div> */}
          </div>

          <div className="topbar-right">
            {/* Theme Switcher */}
            {/* <Menu model={themeMenuItems} popup ref={themeMenuRef} appendTo={document.body} />
            <Button
              icon="pi pi-palette"
              className="p-button-text p-button-plain topbar-item"
              onClick={(e) => {
                e.preventDefault();
                if (themeMenuRef.current) {
                  themeMenuRef.current.toggle(e);
                }
              }}
              tooltip="Change Theme"
            /> */}

            {/* Notifications */}
            {/* <Button
              icon="pi pi-bell"
              className="p-button-text p-button-plain topbar-item notification-btn"
              tooltip="Notifications"
              onClick={handleNotificationClick}
            >
              <Badge value="3" severity="danger" className="notification-badge" />
            </Button> */}

            {/* Connection Status */}
            {/* <div className="connection-status">
              <i className={`pi ${isConnected ? 'pi-circle-fill text-green-500' : 'pi-circle-fill text-red-500'}`}></i>
            </div> */}

            {/* User Menu */}
            <Menu model={userMenuItems} popup ref={userMenuRef} appendTo={document.body} />
            {/* <div
              className="user-profile-section"
              onClick={(e) => {
                e.preventDefault();
                if (userMenuRef.current) {
                  userMenuRef.current.toggle(e);
                }
              }}
            >
              <Avatar
                image={user?.profilePicture}
                icon="pi pi-user"
                shape="circle"
                size="normal"
              />
            </div> */}
              <Avatar
                // image={user?.profilePicture}
                icon="pi pi-user"
                size="normal"
                    onClick={(e) => {
                e.preventDefault();
                if (userMenuRef.current) {
                  userMenuRef.current.toggle(e);
                }
              }}
              />
          </div>
        </div>

        {/* Page Content */}
        <div className="admin-content">
          <CustomBreadcrumb />
          <div className="content-wrapper">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;