import React, { useState, useEffect } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Password } from 'primereact/password';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { organizationService } from '../services/organizationService';
import './Settings.css';

const Settings = () => {
  const { user } = useAuth();
  const { currentTheme, changeTheme, themes } = useTheme();
  const { 
    currentLanguage, 
    timezone, 
    changeLanguage, 
    changeTimezone, 
    refreshSettings,
    t, 
    formatTime,
    getAvailableLanguages,
    getAvailableTimezones 
  } = useLocalization();
  
  const toast = useRef(null);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [organizationSettings, setOrganizationSettings] = useState({
    name: 'Sarya Connective',
    timezone: timezone,
    language: currentLanguage,
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workingHours: { start: '09:00', end: '18:00' }
  });

  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [isUpdatingWorkTime, setIsUpdatingWorkTime] = useState(false);

  // Load organization settings on component mount
  useEffect(() => {
    const loadOrganizationSettings = async () => {
      try {
        const settings = await organizationService.getSettings();
        setOrganizationSettings(settings);
        setWorkStartTime(settings.workingHours?.start || '09:00');
      } catch (error) {
        console.error('Failed to load organization settings:', error);
      }
    };

    if (user?.role === 'admin' || user?.role === 'hr_admin') {
      loadOrganizationSettings();
    }
  }, [user]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    // Password change logic here
    console.log('Password change:', passwordData);
  };

  const handleOrganizationSettingsChange = (field, value) => {
    setOrganizationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOrganizationSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      await organizationService.updateSettings(organizationSettings);
      
      // Refresh localization settings after updating organization settings
      if (refreshSettings) {
        await refreshSettings();
      }
      
      toast.current.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Organization settings updated successfully',
        life: 3000
      });
    } catch (error) {
      console.error('Failed to update organization settings:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: error.response?.data?.message || 'Failed to update organization settings',
        life: 3000
      });
    }
  };

  const handleWorkStartTimeUpdate = async () => {
    setIsUpdatingWorkTime(true);
    try {
      await organizationService.updateWorkStartTime(workStartTime);
      toast.current.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Work start time updated successfully',
        life: 3000
      });
    } catch (error) {
      console.error('Failed to update work start time:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: error.response?.data?.message || 'Failed to update work start time',
        life: 3000
      });
    } finally {
      setIsUpdatingWorkTime(false);
    }
  };

  const themeOptions = themes.map(theme => ({
    label: theme.name,
    value: theme.key
  }));

  const languageOptions = getAvailableLanguages().map(lang => ({
    label: `${lang.nativeName} (${lang.name})`,
    value: lang.code
  }));

  const timezoneOptions = getAvailableTimezones();

  const currencyOptions = [
    { label: 'Indian Rupee (INR)', value: 'INR' },
    { label: 'US Dollar (USD)', value: 'USD' },
    { label: 'Euro (EUR)', value: 'EUR' },
    { label: 'British Pound (GBP)', value: 'GBP' },
    { label: 'Japanese Yen (JPY)', value: 'JPY' }
  ];

  const dateFormatOptions = [
    { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
    { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
    { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }
  ];

  const timeFormatOptions = [
    { label: '24 Hour (HH:mm)', value: 'HH:mm' },
    { label: '12 Hour (hh:mm A)', value: 'hh:mm A' }
  ];

  return (
    <div className="settings-container">
      <Toast ref={toast} />
      
      {/* Header */}
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Customize your application preferences and manage your account settings</p>
      </div>

      {/* Settings Grid */}
      <div className="settings-grid">
        {/* Theme Settings */}
        <div className="settings-card">
          <div className="settings-card-title">
            <div className="settings-card-icon">
              <i className="pi pi-palette"></i>
            </div>
            {t('settings.themeSettings')}
          </div>
          
          <div className="settings-field">
            <label htmlFor="theme" className="settings-label">
              {t('settings.selectTheme')}
            </label>
            <Dropdown
              id="theme"
              value={currentTheme}
              options={themeOptions}
              onChange={(e) => changeTheme(e.value)}
              className="settings-dropdown"
            />
          </div>
          
          <div className="settings-info-box">
            <div className="settings-info-title">
              {t('settings.currentTheme')}: {themes.find(t => t.key === currentTheme)?.name}
            </div>
            <p className="settings-info-text">
              The theme affects the overall appearance of the application including colors, 
              spacing, and component styling.
            </p>
          </div>
        </div>

        {/* Language Settings */}
        <div className="settings-card">
          <div className="settings-card-title">
            <div className="settings-card-icon">
              <i className="pi pi-globe"></i>
            </div>
            {t('settings.languageSettings')}
          </div>
          
          <div className="settings-field">
            <label htmlFor="language" className="settings-label">
              {t('settings.selectLanguage')}
            </label>
            <Dropdown
              id="language"
              value={currentLanguage}
              options={languageOptions}
              onChange={(e) => changeLanguage(e.value)}
              className="settings-dropdown"
            />
          </div>
          
          <div className="settings-info-box">
            <div className="settings-info-title">
              {t('settings.currentLanguage')}: {getAvailableLanguages().find(l => l.code === currentLanguage)?.nativeName}
            </div>
            <p className="settings-info-text">
              Change the language of the application interface.
            </p>
          </div>
        </div>

        {/* Timezone Settings */}
        <div className="settings-card">
          <div className="settings-card-title">
            <div className="settings-card-icon">
              <i className="pi pi-clock"></i>
            </div>
            {t('settings.timezoneSettings')}
          </div>
          
          <div className="settings-field">
            <label htmlFor="timezone" className="settings-label">
              {t('settings.selectTimezone')}
            </label>
            <Dropdown
              id="timezone"
              value={timezone}
              options={timezoneOptions}
              onChange={(e) => changeTimezone(e.value)}
              className="settings-dropdown"
            />
          </div>
          
          <div className="settings-info-box">
            <div className="settings-info-title">
              {t('settings.currentTimezone')}: {timezoneOptions.find(tz => tz.value === timezone)?.label}
            </div>
            <p className="settings-info-text">
              Current time: {formatTime(new Date())}
            </p>
          </div>
        </div>

        {/* Change Password */}
        <div className="settings-card">
          <div className="settings-card-title">
            <div className="settings-card-icon">
              <i className="pi pi-key"></i>
            </div>
            Change Password
          </div>
          
          <form onSubmit={handlePasswordSubmit}>
            <div className="settings-field">
              <label htmlFor="currentPassword" className="settings-label">
                Current Password
              </label>
              <Password
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="settings-password"
                feedback={false}
                toggleMask={false}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="newPassword" className="settings-label">
                New Password
              </label>
              <Password
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="settings-password"
                toggleMask={false}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="confirmPassword" className="settings-label">
                Confirm New Password
              </label>
              <Password
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="settings-password"
                feedback={false}
                toggleMask={false}
              />
            </div>

            <button type="submit" className="settings-button">
              <i className="pi pi-key settings-button-icon"></i>
              Change Password
            </button>
          </form>
        </div>
      </div>

      {/* Organization Settings */}
      {(user?.role === 'admin' || user?.role === 'hr_admin') && (
        <div className="settings-card org-settings-card">
          <div className="settings-card-title">
            <div className="settings-card-icon">
              <i className="pi pi-building"></i>
            </div>
            Organization Settings
          </div>
          
          {/* Work Start Time Section */}
          <div className="work-time-section">
            <div className="settings-field">
              <label htmlFor="workStartTime" className="settings-label">
                Work Start Time
              </label>
              <div className="work-time-input-group">
                <InputText
                  id="workStartTime"
                  type="time"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                  className="settings-input work-time-input"
                />
                <Button
                  label="Update Work Time"
                  icon="pi pi-clock"
                  onClick={handleWorkStartTimeUpdate}
                  loading={isUpdatingWorkTime}
                  className="work-time-button"
                />
              </div>
              <div className="settings-info-box">
                <div className="settings-info-title">
                  Current Work Start Time: {workStartTime}
                </div>
                <p className="settings-info-text">
                  Employees who check in after this time will be marked as late. 
                  This setting affects all employees in the organization.
                </p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleOrganizationSettingsSubmit}>
            <div className="org-settings-grid">
              <div className="settings-field">
                <label htmlFor="orgName" className="settings-label">
                  Organization Name
                </label>
                <InputText
                  id="orgName"
                  value={organizationSettings.name}
                  onChange={(e) => handleOrganizationSettingsChange('name', e.target.value)}
                  className="settings-input"
                />
              </div>
              
              <div className="settings-field">
                <label htmlFor="currency" className="settings-label">
                  Default Currency
                </label>
                <Dropdown
                  id="currency"
                  value={organizationSettings.currency}
                  options={currencyOptions}
                  onChange={(e) => handleOrganizationSettingsChange('currency', e.value)}
                  className="settings-dropdown"
                />
              </div>
              
              <div className="settings-field">
                <label htmlFor="dateFormat" className="settings-label">
                  Date Format
                </label>
                <Dropdown
                  id="dateFormat"
                  value={organizationSettings.dateFormat}
                  options={dateFormatOptions}
                  onChange={(e) => handleOrganizationSettingsChange('dateFormat', e.value)}
                  className="settings-dropdown"
                />
              </div>
              
              <div className="settings-field">
                <label htmlFor="timeFormat" className="settings-label">
                  Time Format
                </label>
                <Dropdown
                  id="timeFormat"
                  value={organizationSettings.timeFormat}
                  options={timeFormatOptions}
                  onChange={(e) => handleOrganizationSettingsChange('timeFormat', e.value)}
                  className="settings-dropdown"
                />
              </div>
            </div>

            <button type="submit" className="settings-button">
              <i className="pi pi-save settings-button-icon"></i>
              Update Organization Settings
            </button>
          </form>
        </div>
      )}

      {/* Application Information */}
      <div className="settings-card app-info-card">
        <div className="settings-card-title">
          <div className="settings-card-icon">
            <i className="pi pi-info-circle"></i>
          </div>
          Application Information
        </div>
        
        <div className="app-info-grid">
          <div className="app-info-section">
            <div className="app-info-item">
              <span className="app-info-label">Application Name</span>
              <span className="app-info-value">Sarya Connective</span>
            </div>
            <div className="app-info-item">
              <span className="app-info-label">Version</span>
              <span className="app-info-value">1.0.0</span>
            </div>
            <div className="app-info-item">
              <span className="app-info-label">Build Date</span>
              <span className="app-info-value">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="app-info-section">
            <div className="app-info-item">
              <span className="app-info-label">User Role</span>
              <span className="app-info-value capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
            <div className="app-info-item">
              <span className="app-info-label">Department</span>
              <span className="app-info-value">{user?.department}</span>
            </div>
            <div className="app-info-item">
              <span className="app-info-label">Last Login</span>
              <span className="app-info-value">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
