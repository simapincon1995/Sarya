import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Avatar } from 'primereact/avatar';
import { Toast } from 'primereact/toast';
import { OverlayPanel } from 'primereact/overlaypanel';
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
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const searchTimeoutRef = useRef(null);
  const toast = useRef(null);
  const documentMenuRef = useRef(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [documentType, setDocumentType] = useState('');

  // CRUD UI state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create'); // 'create' | 'edit'
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managers, setManagers] = useState([]);
  const { hasPermission, user } = useAuth();
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
    loadEmployees(0, 10, '');
    loadManagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const loadEmployees = async (page = currentPage, limit = rowsPerPage, search = globalFilter) => {
    try {
      setIsLoading(true);
      const params = {
        page: page + 1, // API uses 1-based page, DataTable uses 0-based
        limit: limit
      };
      
      // Add search parameter if there's a search term
      if (search && search.trim()) {
        params.search = search.trim();
      }
      
      const data = await employeeService.getEmployees(params);
      setEmployees(data.employees);
      setTotalRecords(data.total);
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
      await loadEmployees(currentPage, rowsPerPage, globalFilter);
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
      await loadEmployees(currentPage, rowsPerPage, globalFilter);
    } catch (e) {
      console.error('Delete employee failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAppointmentLetter = async (employee) => {
    try {
      setIsLoading(true);
      const response = await employeeService.generateAppointmentLetter(employee._id);
      
      // Validate response structure
      if (!response || !response.document || !response.document.content) {
        throw new Error('Invalid response structure from server');
      }
      
      setDocumentContent(response.document.content);
      setDocumentType('Appointment Letter');
      setDocumentDialog(true);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Appointment letter generated successfully'
      });
    } catch (error) {
      console.error('Error generating appointment letter:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.response?.data?.message || error.message || 'Failed to generate appointment letter'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateExperienceCertificate = async (employee) => {
    try {
      setIsLoading(true);
      const lastWorkingDate = new Date().toISOString();
      const response = await employeeService.generateExperienceCertificate(employee._id, lastWorkingDate);
      
      if (!response || !response.document || !response.document.content) {
        throw new Error('Invalid response structure from server');
      }
      
      setDocumentContent(response.document.content);
      setDocumentType('Experience Certificate');
      setDocumentDialog(true);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Experience certificate generated successfully'
      });
    } catch (error) {
      console.error('Error generating experience certificate:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.response?.data?.message || error.message || 'Failed to generate experience certificate'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateRelievingLetter = async (employee) => {
    try {
      setIsLoading(true);
      const lastWorkingDate = new Date().toISOString();
      const response = await employeeService.generateRelievingLetter(employee._id, lastWorkingDate);
      
      if (!response || !response.document || !response.document.content) {
        throw new Error('Invalid response structure from server');
      }
      
      setDocumentContent(response.document.content);
      setDocumentType('Relieving Letter');
      setDocumentDialog(true);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Relieving letter generated successfully'
      });
    } catch (error) {
      console.error('Error generating relieving letter:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.response?.data?.message || error.message || 'Failed to generate relieving letter'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDocument = () => {
    try {
      console.log('Downloading document:', documentType);
      console.log('Content length:', documentContent?.length);
      
      if (!documentContent) {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No document content to download'
        });
        return;
      }

      const blob = new Blob([documentContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create filename with employee name if available
      const fileName = selectedEmployee 
        ? `${documentType.replace(/ /g, '-').toLowerCase()}-${selectedEmployee.firstName}-${selectedEmployee.lastName}.html`
        : `${documentType.replace(/ /g, '-').toLowerCase()}.html`;
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Document downloaded successfully'
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to download document'
      });
    }
  };

  const printDocument = () => {
    try {
      console.log('Printing document:', documentType);
      
      if (!documentContent) {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No document content to print'
        });
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Please allow pop-ups to print documents'
        });
        return;
      }
      
      printWindow.document.write(documentContent);
      printWindow.document.close();
      
      // Wait for content to load before printing
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch (error) {
      console.error('Error printing document:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to print document'
      });
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
              Total: {totalRecords} employees
            </span>
            <div className="flex align-items-center gap-2">
              <i className="pi pi-search"></i>
              <InputText
                value={globalFilter}
                onChange={(e) => {
                  const searchValue = e.target.value;
                  setGlobalFilter(searchValue);
                  
                  // Clear previous timeout
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                  }
                  
                  // Debounce search - reload after user stops typing
                  searchTimeoutRef.current = setTimeout(() => {
                    setCurrentPage(0);
                    loadEmployees(0, rowsPerPage, searchValue);
                  }, 500);
                }}
                placeholder="Search employees..."
                className="w-20rem"
              />
            </div>
          </div>

          <DataTable
            value={employees}
            lazy
            paginator
            rows={rowsPerPage}
            first={currentPage * rowsPerPage}
            totalRecords={totalRecords}
            onPage={(e) => {
              setCurrentPage(e.page);
              setRowsPerPage(e.rows);
              loadEmployees(e.page, e.rows, globalFilter);
            }}
            loading={isLoading}
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
              body={(rowData) => {
                // HR Admin cannot edit/delete admin users
                const canEdit = hasPermission('manage_employees') && 
                  !(user?.role === 'hr_admin' && rowData.role === 'admin');
                const canDelete = hasPermission('manage_employees') && 
                  !(user?.role === 'hr_admin' && rowData.role === 'admin');
                
                return (
                  <div className="flex gap-2">
                    <Button
                      icon="pi pi-eye"
                      className="p-button-text p-button-sm"
                      tooltip="View Details"
                    />
                    {canEdit && (
                      <Button
                        icon="pi pi-pencil"
                        className="p-button-text p-button-sm"
                        tooltip="Edit"
                        onClick={() => openEdit(rowData)}
                      />
                    )}
                    {canDelete && (
                      <Button
                        icon="pi pi-trash"
                        className="p-button-text p-button-sm p-button-danger"
                        tooltip="Delete"
                        onClick={() => deleteEmployee(rowData)}
                      />
                    )}
                    {hasPermission('manage_employees') && (
                      <>
                        <Button
                          icon="pi pi-file"
                          className="p-button-text p-button-sm p-button-help"
                          tooltip="Generate Documents"
                          onClick={(e) => {
                            setSelectedEmployee(rowData);
                            documentMenuRef.current.toggle(e);
                          }}
                        />
                      </>
                    )}
                  </div>
                );
              }}
              style={{ width: '180px' }}
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
                <div className="field">
                  <label htmlFor="employeeId" className="block text-sm font-medium mb-2">
                    Employee ID (Auto-generated)
                  </label>
                  <InputText id="employeeId" className="w-full" value={formData.employeeId} readOnly />
                </div>
              </div>
            )}
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <InputText id="email" className="w-full" value={formData.email} onChange={(e) => onFormChange('email', e.target.value)} />
              </div>
            </div>
            {editorMode === 'create' && (
              <div className="col-12 md:col-6">
                <div className="field">
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <InputText id="password" type="password" className="w-full" value={formData.password} onChange={(e) => onFormChange('password', e.target.value)} />
                </div>
              </div>
            )}
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                  First Name
                </label>
                <InputText id="firstName" className="w-full" value={formData.firstName} onChange={(e) => onFormChange('firstName', e.target.value)} />
              </div>
            </div>
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                  Last Name
                </label>
                <InputText id="lastName" className="w-full" value={formData.lastName} onChange={(e) => onFormChange('lastName', e.target.value)} />
              </div>
            </div>
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="department" className="block text-sm font-medium mb-2">
                  Department
                </label>
                <InputText id="department" className="w-full" value={formData.department} onChange={(e) => onFormChange('department', e.target.value)} />
              </div>
            </div>
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="designation" className="block text-sm font-medium mb-2">
                  Designation
                </label>
                <InputText id="designation" className="w-full" value={formData.designation} onChange={(e) => onFormChange('designation', e.target.value)} />
              </div>
            </div>
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="role" className="block text-sm font-medium mb-2">
                  Role
                </label>
                <Dropdown 
                  id="role" 
                  className="w-full" 
                  value={formData.role} 
                  onChange={(e) => onFormChange('role', e.value)} 
                  options={(() => {
                    const allRoles = [
                      { label: 'Admin', value: 'admin' }, 
                      { label: 'HR Admin', value: 'hr_admin' }, 
                      { label: 'Manager', value: 'manager' }, 
                      { label: 'Employee', value: 'employee' }
                    ];
                    // HR Admin cannot see or assign admin role
                    if (user?.role === 'hr_admin') {
                      return allRoles.filter(role => role.value !== 'admin');
                    }
                    return allRoles;
                  })()}
                  disabled={user?.role === 'hr_admin' && editingEmployee?.role === 'admin'}
                  tooltip={user?.role === 'hr_admin' && editingEmployee?.role === 'admin' ? 'HR Admin cannot modify admin user roles' : ''}
                />
              </div>
            </div>
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="manager" className="block text-sm font-medium mb-2">
                  Manager
                </label>
                <Dropdown id="manager" className="w-full" value={formData.manager} onChange={(e) => onFormChange('manager', e.value)} options={(managers || []).map(m => ({ label: `${m.firstName} ${m.lastName}`, value: m._id }))} placeholder="Select Manager" />
              </div>
            </div>
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                  Phone
                </label>
                <InputText id="phone" className="w-full" value={formData.phone} onChange={(e) => onFormChange('phone', e.target.value)} />
              </div>
            </div>
            {editorMode === 'edit' && (
              <div className="col-12 md:col-6">
                <div className="field">
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                    Set/Reset Password
                  </label>
                  <InputText id="newPassword" type="password" className="w-full" value={formData.password} onChange={(e) => onFormChange('password', e.target.value)} />
                </div>
              </div>
            )}
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="salary" className="block text-sm font-medium mb-2">
                  Salary
                </label>
                <InputText id="salary" className="w-full" value={formData.salary} onChange={(e) => onFormChange('salary', e.target.value)} />
              </div>
            </div>
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="joiningDate" className="block text-sm font-medium mb-2">
                  Joining Date
                </label>
                <Calendar id="joiningDate" className="w-full" value={formData.joiningDate} onChange={(e) => onFormChange('joiningDate', e.value)} showIcon />
              </div>
            </div>
          </div>
        </Dialog>

        {/* Document Generation Overlay */}
        <OverlayPanel ref={documentMenuRef} style={{ width: '250px' }}>
          <div className="flex flex-column gap-2">
            <Button
              label="Appointment Letter"
              icon="pi pi-file"
              className="p-button-text justify-content-start"
              onClick={() => {
                generateAppointmentLetter(selectedEmployee);
                documentMenuRef.current.hide();
              }}
            />
            <Button
              label="Experience Certificate"
              icon="pi pi-briefcase"
              className="p-button-text justify-content-start"
              onClick={() => {
                generateExperienceCertificate(selectedEmployee);
                documentMenuRef.current.hide();
              }}
            />
            <Button
              label="Relieving Letter"
              icon="pi pi-sign-out"
              className="p-button-text justify-content-start"
              onClick={() => {
                generateRelievingLetter(selectedEmployee);
                documentMenuRef.current.hide();
              }}
            />
          </div>
        </OverlayPanel>

        {/* Document Preview Dialog */}
        <Dialog
          header={documentType}
          visible={documentDialog}
          style={{ width: '900px' }}
          modal
          onHide={() => {
            setDocumentDialog(false);
            setDocumentContent('');
            setDocumentType('');
          }}
          footer={
            <div className="flex justify-content-end gap-2">
              <Button
                label="Download"
                icon="pi pi-download"
                onClick={downloadDocument}
              />
              <Button
                label="Print"
                icon="pi pi-print"
                onClick={printDocument}
              />
              <Button
                label="Close"
                icon="pi pi-times"
                className="p-button-text"
                onClick={() => {
                  setDocumentDialog(false);
                  setDocumentContent('');
                  setDocumentType('');
                }}
              />
            </div>
          }
        >
          {documentContent ? (
            <div
              style={{
                height: '70vh',
                overflow: 'auto',
                border: '1px solid #ddd',
                padding: '20px',
                background: '#fff'
              }}
              dangerouslySetInnerHTML={{ __html: documentContent }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="pi pi-spin pi-spinner" style={{ fontSize: '3rem' }}></i>
              <p>Loading document...</p>
            </div>
          )}
        </Dialog>

        <Toast ref={toast} />
      </div>
    </div>
  );
};

export default Employees;
