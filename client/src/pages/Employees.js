import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Avatar } from 'primereact/avatar';
import { useAuth } from '../contexts/AuthContext';
import { employeeService } from '../services/employeeService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const { hasPermission } = useAuth();

  // CRUD UI state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create'); // 'create' | 'edit'
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    designation: '',
    manager: null,
    phone: '',
    salary: 0,
    joiningDate: null
  });

  useEffect(() => {
    loadEmployees();
    loadManagers();
  }, []);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await employeeService.getEmployees();
      setEmployees(data.employees);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const data = await employeeService.getManagers();
      setManagers(data);
    } catch (e) {
      // ignore
    }
  };

  const openCreate = () => {
    setEditorMode('create');
    setEditingEmployee(null);
    setFormData({
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'employee',
      department: '',
      designation: '',
      manager: null,
      phone: '',
      salary: 0,
      joiningDate: null
    });
    setIsEditorOpen(true);
  };

  const openEdit = (row) => {
    setEditorMode('edit');
    setEditingEmployee(row);
    setFormData({
      employeeId: row.employeeId || '',
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      email: row.email || '',
      password: '',
      role: row.role || 'employee',
      department: row.department || '',
      designation: row.designation || '',
      manager: row.manager?._id || row.manager || null,
      phone: row.phone || '',
      salary: row.salary || 0,
      joiningDate: row.joiningDate ? new Date(row.joiningDate) : null
    });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingEmployee(null);
  };

  const onFormChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitForm = async () => {
    try {
      setIsSubmitting(true);
      if (editorMode === 'create') {
        const createData = { ...formData };
        // Remove employeeId for creation - let backend auto-generate UUID
        delete createData.employeeId;
        await employeeService.createEmployee({
          ...createData,
          joiningDate: formData.joiningDate || new Date()
        });
      } else if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee._id || editingEmployee.id, {
          ...formData,
          // only send password if provided
          password: formData.password || undefined
        });
      }
      closeEditor();
      await loadEmployees();
    } catch (e) {
      console.error('Save employee failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEmployee = async (row) => {
    try {
      setIsLoading(true);
      await employeeService.deleteEmployee(row._id || row.id);
      await loadEmployees();
    } catch (e) {
      console.error('Delete employee failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { severity: 'danger', label: 'Admin' },
      hr_admin: { severity: 'warning', label: 'HR Admin' },
      manager: { severity: 'info', label: 'Manager' },
      employee: { severity: 'success', label: 'Employee' }
    };

    const config = roleConfig[role] || { severity: 'secondary', label: role };
    return <Tag value={config.label} severity={config.severity} />;
  };

  const getStatusBadge = (isActive) => {
    return (
      <Tag
        value={isActive ? 'Active' : 'Inactive'}
        severity={isActive ? 'success' : 'danger'}
      />
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading employees..." />;
  }

  return (
    <div className="grid">
      <div className="col-12">
        <Card>
          <div className="flex justify-content-between align-items-center mb-4">
            <h2 className="text-2xl font-bold m-0">Employees</h2>
            {hasPermission('manage_employees') && (
              <Button
                label="Add Employee"
                icon="pi pi-plus"
                className="p-button-primary"
                onClick={openCreate}
              />
            )}
          </div>

          <div className="flex justify-content-between align-items-center mb-4">
            <span className="text-color-secondary">
              Total: {employees.length} employees
            </span>
            <div className="flex align-items-center gap-2">
              <i className="pi pi-search"></i>
              <InputText
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search employees..."
                className="w-20rem"
              />
            </div>
          </div>

          <DataTable
            value={employees}
            globalFilter={globalFilter}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            emptyMessage="No employees found"
            className="p-datatable-sm"
          >
            <Column
              field="employeeId"
              header="ID"
              sortable
              style={{ width: '100px' }}
            />
            <Column
              header="Employee"
              body={(rowData) => (
                <div className="flex align-items-center gap-2">
                  <Avatar
                    image={rowData.profilePicture}
                    icon="pi pi-user"
                    shape="circle"
                    size="small"
                  />
                  <div>
                    <div className="font-medium">
                      {rowData.firstName} {rowData.lastName}
                    </div>
                    <div className="text-sm text-color-secondary">
                      {rowData.email}
                    </div>
                  </div>
                </div>
              )}
            />
            <Column
              field="department"
              header="Department"
              sortable
            />
            <Column
              field="designation"
              header="Designation"
              sortable
            />
            <Column
              field="role"
              header="Role"
              body={(rowData) => getRoleBadge(rowData.role)}
              sortable
            />
            <Column
              field="isActive"
              header="Status"
              body={(rowData) => getStatusBadge(rowData.isActive)}
              sortable
            />
            <Column
              header="Actions"
              body={(rowData) => (
                <div className="flex gap-2">
                  <Button
                    icon="pi pi-eye"
                    className="p-button-text p-button-sm"
                    tooltip="View Details"
                  />
                  {hasPermission('manage_employees') && (
                    <>
                      <Button
                        icon="pi pi-pencil"
                        className="p-button-text p-button-sm"
                        tooltip="Edit"
                        onClick={() => openEdit(rowData)}
                      />
                      <Button
                        icon="pi pi-trash"
                        className="p-button-text p-button-sm p-button-danger"
                        tooltip="Delete"
                        onClick={() => deleteEmployee(rowData)}
                      />
                    </>
                  )}
                </div>
              )}
              style={{ width: '120px' }}
            />
          </DataTable>
        </Card>
        <Dialog
          header={editorMode === 'create' ? 'Add Employee' : 'Edit Employee'}
          visible={isEditorOpen}
          style={{ width: '600px' }}
          modal
          onHide={closeEditor}
          footer={
            <div className="flex justify-content-end gap-2">
              <Button label="Cancel" className="p-button-text" onClick={closeEditor} />
              <Button label={editorMode === 'create' ? 'Create' : 'Save'} icon="pi pi-check" loading={isSubmitting} onClick={submitForm} />
            </div>
          }
        >
          <div className="grid">
            {editorMode === 'edit' && (
              <div className="col-12 md:col-6">
                <span className="p-float-label w-full">
                  <InputText id="employeeId" className="w-full" value={formData.employeeId} readOnly />
                  <label htmlFor="employeeId">Employee ID (Auto-generated)</label>
                </span>
              </div>
            )}
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <InputText id="email" className="w-full" value={formData.email} onChange={(e) => onFormChange('email', e.target.value)} />
                <label htmlFor="email">Email</label>
              </span>
            </div>
            {editorMode === 'create' && (
              <div className="col-12 md:col-6">
                <span className="p-float-label w-full">
                  <InputText id="password" type="password" className="w-full" value={formData.password} onChange={(e) => onFormChange('password', e.target.value)} />
                  <label htmlFor="password">Password</label>
                </span>
              </div>
            )}
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <InputText id="firstName" className="w-full" value={formData.firstName} onChange={(e) => onFormChange('firstName', e.target.value)} />
                <label htmlFor="firstName">First Name</label>
              </span>
            </div>
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <InputText id="lastName" className="w-full" value={formData.lastName} onChange={(e) => onFormChange('lastName', e.target.value)} />
                <label htmlFor="lastName">Last Name</label>
              </span>
            </div>
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <InputText id="department" className="w-full" value={formData.department} onChange={(e) => onFormChange('department', e.target.value)} />
                <label htmlFor="department">Department</label>
              </span>
            </div>
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <InputText id="designation" className="w-full" value={formData.designation} onChange={(e) => onFormChange('designation', e.target.value)} />
                <label htmlFor="designation">Designation</label>
              </span>
            </div>
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <Dropdown id="role" className="w-full" value={formData.role} onChange={(e) => onFormChange('role', e.value)} options={[{ label: 'Admin', value: 'admin' }, { label: 'HR Admin', value: 'hr_admin' }, { label: 'Manager', value: 'manager' }, { label: 'Employee', value: 'employee' }]} />
                <label htmlFor="role">Role</label>
              </span>
            </div>
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <Dropdown id="manager" className="w-full" value={formData.manager} onChange={(e) => onFormChange('manager', e.value)} options={(managers || []).map(m => ({ label: `${m.firstName} ${m.lastName}`, value: m._id }))} placeholder="Select Manager" />
                <label htmlFor="manager">Manager</label>
              </span>
            </div>
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <InputText id="phone" className="w-full" value={formData.phone} onChange={(e) => onFormChange('phone', e.target.value)} />
                <label htmlFor="phone">Phone</label>
              </span>
            </div>
            {editorMode === 'edit' && (
              <div className="col-12 md:col-6">
                <span className="p-float-label w-full">
                  <InputText id="newPassword" type="password" className="w-full" value={formData.password} onChange={(e) => onFormChange('password', e.target.value)} />
                  <label htmlFor="newPassword">Set/Reset Password</label>
                </span>
              </div>
            )}
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <InputText id="salary" className="w-full" value={formData.salary} onChange={(e) => onFormChange('salary', e.target.value)} />
                <label htmlFor="salary">Salary</label>
              </span>
            </div>
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <Calendar id="joiningDate" className="w-full" value={formData.joiningDate} onChange={(e) => onFormChange('joiningDate', e.value)} showIcon />
                <label htmlFor="joiningDate">Joining Date</label>
              </span>
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  );
};

export default Employees;
