import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Password } from 'primereact/password';
import { InputText } from 'primereact/inputtext';
// import { InputTextarea } from 'primereact/inputtextarea';
// import { Calendar } from 'primereact/calendar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { organizationService } from '../services/organizationService';

const Settings = () => {
  const { user } = useAuth();
  const { currentTheme, changeTheme, themes } = useTheme();
  const { 
    currentLanguage, 
    timezone, 
    changeLanguage, 
    changeTimezone, 
    t, 
    formatTime,
    getAvailableLanguages,
    getAvailableTimezones 
  } = useLocalization();
  
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
      console.log('Organization settings updated successfully');
    } catch (error) {
      console.error('Failed to update organization settings:', error);
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
    <div className="grid">
      {/* Theme Settings */}
      <div className="col-12 lg:col-6">
        <Card title={t('settings.themeSettings')}>
          <div className="flex flex-column gap-4">
            <div className="field">
              <label htmlFor="theme" className="block text-sm font-medium mb-2">
                {t('settings.selectTheme')}
              </label>
              <Dropdown
                id="theme"
                value={currentTheme}
                options={themeOptions}
                onChange={(e) => changeTheme(e.value)}
                className="w-full"
              />
            </div>
            
            <div className="p-3 border-1 surface-border border-round">
              <h4 className="mb-2">
                {t('settings.currentTheme')}: {themes.find(t => t.key === currentTheme)?.name}
              </h4>
              <p className="text-sm text-color-secondary mb-0">
                The theme affects the overall appearance of the application including colors, 
                spacing, and component styling.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Language Settings */}
      <div className="col-12 lg:col-6">
        <Card title={t('settings.languageSettings')}>
          <div className="flex flex-column gap-4">
            <div className="field">
              <label htmlFor="language" className="block text-sm font-medium mb-2">
                {t('settings.selectLanguage')}
              </label>
              <Dropdown
                id="language"
                value={currentLanguage}
                options={languageOptions}
                onChange={(e) => changeLanguage(e.value)}
                className="w-full"
              />
            </div>
            
            <div className="p-3 border-1 surface-border border-round">
              <h4 className="mb-2">
                {t('settings.currentLanguage')}: {getAvailableLanguages().find(l => l.code === currentLanguage)?.nativeName}
              </h4>
              <p className="text-sm text-color-secondary mb-0">
                Change the language of the application interface.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Timezone Settings */}
      <div className="col-12 lg:col-6">
        <Card title={t('settings.timezoneSettings')}>
          <div className="flex flex-column gap-4">
            <div className="field">
              <label htmlFor="timezone" className="block text-sm font-medium mb-2">
                {t('settings.selectTimezone')}
              </label>
              <Dropdown
                id="timezone"
                value={timezone}
                options={timezoneOptions}
                onChange={(e) => changeTimezone(e.value)}
                className="w-full"
              />
            </div>
            
            <div className="p-3 border-1 surface-border border-round">
              <h4 className="mb-2">
                {t('settings.currentTimezone')}: {timezoneOptions.find(tz => tz.value === timezone)?.label}
              </h4>
              <p className="text-sm text-color-secondary mb-0">
                Current time: {formatTime(new Date())}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12 lg:col-6">
        <Card title="Change Password">
          <form onSubmit={handlePasswordSubmit} className="flex flex-column gap-4">
            <div className="field">
              <label htmlFor="currentPassword" className="block text-sm font-medium mb-2">
                Current Password
              </label>
              <Password
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full"
                feedback={false}
                toggleMask
              />
            </div>

            <div className="field">
              <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                New Password
              </label>
              <Password
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full"
                toggleMask
              />
            </div>

            <div className="field">
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm New Password
              </label>
              <Password
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full"
                feedback={false}
                toggleMask
              />
            </div>

            <Button
              type="submit"
              label="Change Password"
              icon="pi pi-key"
              className="p-button-primary"
            />
          </form>
        </Card>
      </div>

      {/* Organization Settings */}
      {user?.role === 'admin' && (
        <div className="col-12">
          <Card title="Organization Settings">
            <form onSubmit={handleOrganizationSettingsSubmit} className="flex flex-column gap-4">
              <div className="grid">
                <div className="col-12 md:col-6">
                  <div className="field">
                    <label htmlFor="orgName" className="block text-sm font-medium mb-2">
                      Organization Name
                    </label>
                    <InputText
                      id="orgName"
                      value={organizationSettings.name}
                      onChange={(e) => handleOrganizationSettingsChange('name', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-12 md:col-6">
                  <div className="field">
                    <label htmlFor="currency" className="block text-sm font-medium mb-2">
                      Default Currency
                    </label>
                    <Dropdown
                      id="currency"
                      value={organizationSettings.currency}
                      options={currencyOptions}
                      onChange={(e) => handleOrganizationSettingsChange('currency', e.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="grid">
                <div className="col-12 md:col-6">
                  <div className="field">
                    <label htmlFor="dateFormat" className="block text-sm font-medium mb-2">
                      Date Format
                    </label>
                    <Dropdown
                      id="dateFormat"
                      value={organizationSettings.dateFormat}
                      options={dateFormatOptions}
                      onChange={(e) => handleOrganizationSettingsChange('dateFormat', e.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-12 md:col-6">
                  <div className="field">
                    <label htmlFor="timeFormat" className="block text-sm font-medium mb-2">
                      Time Format
                    </label>
                    <Dropdown
                      id="timeFormat"
                      value={organizationSettings.timeFormat}
                      options={timeFormatOptions}
                      onChange={(e) => handleOrganizationSettingsChange('timeFormat', e.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                label="Update Organization Settings"
                icon="pi pi-save"
                className="p-button-primary"
              />
            </form>
          </Card>
        </div>
      )}

      <div className="col-12">
        <Card title="Application Information">
          <div className="grid">
            <div className="col-12 md:col-6">
              <div className="flex flex-column gap-3">
                <div className="flex justify-content-between">
                  <span className="text-sm font-medium">Application Name:</span>
                  <span className="text-sm">Sarya Connective</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-sm font-medium">Version:</span>
                  <span className="text-sm">1.0.0</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-sm font-medium">Build Date:</span>
                  <span className="text-sm">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="col-12 md:col-6">
              <div className="flex flex-column gap-3">
                <div className="flex justify-content-between">
                  <span className="text-sm font-medium">User Role:</span>
                  <span className="text-sm capitalize">{user?.role?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-sm font-medium">Department:</span>
                  <span className="text-sm">{user?.department}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-sm font-medium">Last Login:</span>
                  <span className="text-sm">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
