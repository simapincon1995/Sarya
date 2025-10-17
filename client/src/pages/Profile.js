import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
// import { InputTextarea } from 'primereact/inputtextarea';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || {},
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth) : null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Update profile logic here
    console.log('Profile update:', formData);
  };

  return (
    <div className="grid">
      <div className="col-12 lg:col-8">
        <Card title="Profile Information">
          <form onSubmit={handleSubmit} className="flex flex-column gap-4">
            <div className="grid">
              <div className="col-12 md:col-6">
                <div className="field">
                  <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                    First Name
                  </label>
                  <InputText
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="field">
                  <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                    Last Name
                  </label>
                  <InputText
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="grid">
              <div className="col-12 md:col-6">
                <div className="field">
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <InputText
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full"
                    disabled
                  />
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="field">
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Phone
                  </label>
                  <InputText
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-2">
                Date of Birth
              </label>
              <Calendar
                id="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.value }))}
                className="w-full"
                showIcon
              />
            </div>

            <div className="field">
              <label className="block text-sm font-medium mb-2">Address</label>
              <div className="grid">
                <div className="col-12">
                  <InputText
                    name="street"
                    placeholder="Street Address"
                    value={formData.address.street || ''}
                    onChange={handleAddressChange}
                    className="w-full mb-2"
                  />
                </div>
                <div className="col-12 md:col-4">
                  <InputText
                    name="city"
                    placeholder="City"
                    value={formData.address.city || ''}
                    onChange={handleAddressChange}
                    className="w-full"
                  />
                </div>
                <div className="col-12 md:col-4">
                  <InputText
                    name="state"
                    placeholder="State"
                    value={formData.address.state || ''}
                    onChange={handleAddressChange}
                    className="w-full"
                  />
                </div>
                <div className="col-12 md:col-4">
                  <InputText
                    name="zipCode"
                    placeholder="ZIP Code"
                    value={formData.address.zipCode || ''}
                    onChange={handleAddressChange}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              label="Update Profile"
              icon="pi pi-save"
              className="p-button-primary"
            />
          </form>
        </Card>
      </div>

      <div className="col-12 lg:col-4">
        <Card title="Account Information">
          <div className="flex flex-column gap-3">
            <div className="flex justify-content-between">
              <span className="text-sm font-medium">Employee ID:</span>
              <span className="text-sm">{user?.employeeId}</span>
            </div>
            <div className="flex justify-content-between">
              <span className="text-sm font-medium">Department:</span>
              <span className="text-sm">{user?.department}</span>
            </div>
            <div className="flex justify-content-between">
              <span className="text-sm font-medium">Designation:</span>
              <span className="text-sm">{user?.designation}</span>
            </div>
            <div className="flex justify-content-between">
              <span className="text-sm font-medium">Role:</span>
              <span className="text-sm capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-content-between">
              <span className="text-sm font-medium">Joining Date:</span>
              <span className="text-sm">
                {user?.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : '-'}
              </span>
            </div>
            <div className="flex justify-content-between">
              <span className="text-sm font-medium">Last Login:</span>
              <span className="text-sm">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
