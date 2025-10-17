import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { payrollService } from '../services/payrollService';
import { employeeService } from '../services/employeeService';

const Payroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create'); // 'create' | 'edit'
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [viewingPayroll, setViewingPayroll] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    basicSalary: 0,
    allowances: {
      hra: 0,
      medical: 0,
      transport: 0,
      other: 0
    },
    deductions: {
      pf: 0,
      esi: 0,
      tax: 0,
      other: 0
    },
    overtime: {
      hours: 0,
      rate: 0
    },
    bonus: 0
  });
  const { hasPermission } = useAuth();
  const toast = React.useRef(null);

  useEffect(() => {
    loadPayrolls();
    loadEmployees();
  }, []);

  const loadPayrolls = async () => {
    try {
      setIsLoading(true);
      const data = await payrollService.getPayrolls({ limit: 100 });
      setPayrolls(data.payrolls || []);
    } catch (error) {
      console.error('Error loading payrolls:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load payrolls'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const openCreate = () => {
    setEditorMode('create');
    setEditingPayroll(null);
    setFormData({
      employee: '',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      basicSalary: 0,
      allowances: {
        hra: 0,
        medical: 0,
        transport: 0,
        other: 0
      },
      deductions: {
        pf: 0,
        esi: 0,
        tax: 0,
        other: 0
      },
      overtime: {
        hours: 0,
        rate: 0
      },
      bonus: 0
    });
    setIsEditorOpen(true);
  };

  const openEdit = (row) => {
    setEditorMode('edit');
    setEditingPayroll(row);
    setFormData({
      employee: row.employee._id || row.employee,
      year: row.year,
      month: row.month,
      basicSalary: row.basicSalary || 0,
      allowances: {
        hra: row.allowances?.hra || 0,
        medical: row.allowances?.medical || 0,
        transport: row.allowances?.transport || 0,
        other: row.allowances?.other || 0
      },
      deductions: {
        pf: row.deductions?.pf || 0,
        esi: row.deductions?.esi || 0,
        tax: row.deductions?.tax || 0,
        other: row.deductions?.other || 0
      },
      overtime: {
        hours: row.overtime?.hours || 0,
        rate: row.overtime?.rate || 0
      },
      bonus: row.bonus || 0
    });
    setIsEditorOpen(true);
  };

  const openDetail = (row) => {
    setViewingPayroll(row);
    setIsDetailOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingPayroll(null);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setViewingPayroll(null);
  };

  const onFormChange = (name, value) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const submitForm = async () => {
    try {
      setIsSubmitting(true);
      if (editorMode === 'create') {
        await payrollService.createPayroll(formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Payroll created successfully'
        });
      } else if (editingPayroll) {
        await payrollService.updatePayroll(editingPayroll._id, formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Payroll updated successfully'
        });
      }
      closeEditor();
      await loadPayrolls();
    } catch (error) {
      console.error('Save payroll failed:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save payroll'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePayroll = async (row) => {
    try {
      await payrollService.deletePayroll(row._id);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Payroll deleted successfully'
      });
      await loadPayrolls();
    } catch (error) {
      console.error('Delete payroll failed:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete payroll'
      });
    }
  };

  const confirmDelete = (row) => {
    confirmDialog({
      message: 'Are you sure you want to delete this payroll record?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deletePayroll(row)
    });
  };

  const monthOptions = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { severity: 'secondary', label: 'Draft' },
      generated: { severity: 'info', label: 'Generated' },
      approved: { severity: 'warning', label: 'Approved' },
      paid: { severity: 'success', label: 'Paid' }
    };

    const config = statusConfig[status] || { severity: 'secondary', label: status };
    return <Tag value={config.label} severity={config.severity} />;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading payroll..." />;
  }

  return (
    <div className="grid">
      <Toast ref={toast} />
      <ConfirmDialog />
      <div className="col-12">
        <Card>
          <div className="flex justify-content-between align-items-center mb-4">
            <h2 className="text-2xl font-bold m-0">Payroll Management</h2>
            {hasPermission('manage_payroll') && (
              <Button
                label="Generate Payroll"
                icon="pi pi-calculator"
                className="p-button-primary"
                onClick={openCreate}
              />
            )}
          </div>

          <DataTable
            value={payrolls}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25]}
            emptyMessage="No payroll records found"
            className="p-datatable-sm"
          >
            <Column
              field="employee.employeeId"
              header="Employee ID"
              sortable
            />
            <Column
              header="Employee"
              body={(rowData) => (
                <div>
                  <div className="font-medium">
                    {rowData.employee.firstName} {rowData.employee.lastName}
                  </div>
                </div>
              )}
            />
            <Column
              header="Period"
              body={(rowData) => (
                <div>
                  {new Date(rowData.year, rowData.month - 1).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              )}
              sortable
            />
            <Column
              field="basicSalary"
              header="Basic Salary"
              body={(rowData) => formatCurrency(rowData.basicSalary)}
              sortable
            />
            <Column
              field="calculations.grossSalary"
              header="Gross Salary"
              body={(rowData) => formatCurrency(rowData.calculations?.grossSalary || 0)}
              sortable
            />
            <Column
              field="calculations.netSalary"
              header="Net Salary"
              body={(rowData) => formatCurrency(rowData.calculations?.netSalary || 0)}
              sortable
            />
            <Column
              field="status"
              header="Status"
              body={(rowData) => getStatusBadge(rowData.status)}
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
                    onClick={() => openDetail(rowData)}
                  />
                  <Button
                    icon="pi pi-file-pdf"
                    className="p-button-text p-button-sm"
                    tooltip="Download Payslip"
                  />
                  {hasPermission('manage_payroll') && (
                    <>
                      <Button
                        icon="pi pi-pencil"
                        className="p-button-text p-button-sm"
                        tooltip="Edit"
                        onClick={() => openEdit(rowData)}
                      />
                      {rowData.status === 'draft' && (
                        <Button
                          icon="pi pi-trash"
                          className="p-button-text p-button-sm p-button-danger"
                          tooltip="Delete"
                          onClick={() => confirmDelete(rowData)}
                        />
                      )}
                      {rowData.status === 'generated' && (
                        <Button
                          icon="pi pi-check"
                          className="p-button-text p-button-sm p-button-success"
                          tooltip="Approve"
                        />
                      )}
                    </>
                  )}
                </div>
              )}
              style={{ width: '200px' }}
            />
          </DataTable>
        </Card>

        {/* Payroll Editor Dialog */}
        <Dialog
          header={editorMode === 'create' ? 'Generate Payroll' : 'Edit Payroll'}
          visible={isEditorOpen}
          style={{ width: '800px' }}
          modal
          onHide={closeEditor}
          footer={
            <div className="flex justify-content-end gap-2">
              <Button label="Cancel" className="p-button-text" onClick={closeEditor} />
              <Button 
                label={editorMode === 'create' ? 'Generate' : 'Update'} 
                icon="pi pi-check" 
                loading={isSubmitting} 
                onClick={submitForm} 
              />
            </div>
          }
        >
          <div className="grid">
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <Dropdown 
                  id="employee" 
                  className="w-full" 
                  value={formData.employee} 
                  onChange={(e) => onFormChange('employee', e.value)} 
                  options={employees.map(emp => ({
                    label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`,
                    value: emp._id
                  }))}
                />
                <label htmlFor="employee">Employee *</label>
              </span>
            </div>

            <div className="col-12 md:col-3">
              <span className="p-float-label w-full">
                <Dropdown 
                  id="month" 
                  className="w-full" 
                  value={formData.month} 
                  onChange={(e) => onFormChange('month', e.value)} 
                  options={monthOptions}
                />
                <label htmlFor="month">Month *</label>
              </span>
            </div>

            <div className="col-12 md:col-3">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="year" 
                  className="w-full" 
                  value={formData.year} 
                  onValueChange={(e) => onFormChange('year', e.value)} 
                  useGrouping={false}
                />
                <label htmlFor="year">Year *</label>
              </span>
            </div>

            <div className="col-12">
              <h5>Basic Salary & Overtime</h5>
            </div>

            <div className="col-12 md:col-4">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="basicSalary" 
                  className="w-full" 
                  value={formData.basicSalary} 
                  onValueChange={(e) => onFormChange('basicSalary', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="basicSalary">Basic Salary *</label>
              </span>
            </div>

            <div className="col-12 md:col-4">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="overtimeHours" 
                  className="w-full" 
                  value={formData.overtime.hours} 
                  onValueChange={(e) => onFormChange('overtime.hours', e.value)} 
                />
                <label htmlFor="overtimeHours">Overtime Hours</label>
              </span>
            </div>

            <div className="col-12 md:col-4">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="overtimeRate" 
                  className="w-full" 
                  value={formData.overtime.rate} 
                  onValueChange={(e) => onFormChange('overtime.rate', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="overtimeRate">Overtime Rate</label>
              </span>
            </div>

            <div className="col-12">
              <h5>Allowances</h5>
            </div>

            <div className="col-12 md:col-3">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="hra" 
                  className="w-full" 
                  value={formData.allowances.hra} 
                  onValueChange={(e) => onFormChange('allowances.hra', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="hra">HRA</label>
              </span>
            </div>

            <div className="col-12 md:col-3">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="medical" 
                  className="w-full" 
                  value={formData.allowances.medical} 
                  onValueChange={(e) => onFormChange('allowances.medical', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="medical">Medical</label>
              </span>
            </div>

            <div className="col-12 md:col-3">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="transport" 
                  className="w-full" 
                  value={formData.allowances.transport} 
                  onValueChange={(e) => onFormChange('allowances.transport', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="transport">Transport</label>
              </span>
            </div>

            <div className="col-12 md:col-3">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="otherAllowances" 
                  className="w-full" 
                  value={formData.allowances.other} 
                  onValueChange={(e) => onFormChange('allowances.other', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="otherAllowances">Other</label>
              </span>
            </div>

            <div className="col-12">
              <h5>Deductions</h5>
            </div>

            <div className="col-12 md:col-3">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="pf" 
                  className="w-full" 
                  value={formData.deductions.pf} 
                  onValueChange={(e) => onFormChange('deductions.pf', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="pf">PF</label>
              </span>
            </div>

            <div className="col-12 md:col-3">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="esi" 
                  className="w-full" 
                  value={formData.deductions.esi} 
                  onValueChange={(e) => onFormChange('deductions.esi', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="esi">ESI</label>
              </span>
            </div>

            <div className="col-12 md:col-3">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="tax" 
                  className="w-full" 
                  value={formData.deductions.tax} 
                  onValueChange={(e) => onFormChange('deductions.tax', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="tax">Tax</label>
              </span>
            </div>

            <div className="col-12 md:col-3">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="otherDeductions" 
                  className="w-full" 
                  value={formData.deductions.other} 
                  onValueChange={(e) => onFormChange('deductions.other', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="otherDeductions">Other</label>
              </span>
            </div>

            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <InputNumber 
                  id="bonus" 
                  className="w-full" 
                  value={formData.bonus} 
                  onValueChange={(e) => onFormChange('bonus', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
                <label htmlFor="bonus">Bonus</label>
              </span>
            </div>
          </div>
        </Dialog>

        {/* Payroll Detail Dialog */}
        <Dialog
          header="Payroll Details"
          visible={isDetailOpen}
          style={{ width: '700px' }}
          modal
          onHide={closeDetail}
          footer={
            <div className="flex justify-content-end">
              <Button label="Close" className="p-button-text" onClick={closeDetail} />
            </div>
          }
        >
          {viewingPayroll && (
            <div className="grid">
              <div className="col-12">
                <div className="text-center mb-4">
                  <h4 className="m-0">
                    {viewingPayroll.employee?.firstName} {viewingPayroll.employee?.lastName}
                  </h4>
                  <p className="text-color-secondary m-0">
                    {new Date(viewingPayroll.year, viewingPayroll.month - 1).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="col-12 md:col-6">
                <Card title="Earnings" className="h-full">
                  <div className="flex justify-content-between mb-2">
                    <span>Basic Salary:</span>
                    <span>{formatCurrency(viewingPayroll.basicSalary)}</span>
                  </div>
                  {viewingPayroll.allowances && Object.entries(viewingPayroll.allowances).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-content-between mb-2">
                        <span>{key.toUpperCase()}:</span>
                        <span>{formatCurrency(value)}</span>
                      </div>
                    )
                  ))}
                  {viewingPayroll.overtime?.hours > 0 && (
                    <div className="flex justify-content-between mb-2">
                      <span>Overtime ({viewingPayroll.overtime.hours}h):</span>
                      <span>{formatCurrency(viewingPayroll.overtime.hours * viewingPayroll.overtime.rate)}</span>
                    </div>
                  )}
                  {viewingPayroll.bonus > 0 && (
                    <div className="flex justify-content-between mb-2">
                      <span>Bonus:</span>
                      <span>{formatCurrency(viewingPayroll.bonus)}</span>
                    </div>
                  )}
                  <hr />
                  <div className="flex justify-content-between font-bold text-lg">
                    <span>Gross Total:</span>
                    <span>{formatCurrency(viewingPayroll.calculations?.grossSalary || 0)}</span>
                  </div>
                </Card>
              </div>

              <div className="col-12 md:col-6">
                <Card title="Deductions" className="h-full">
                  {viewingPayroll.deductions && Object.entries(viewingPayroll.deductions).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-content-between mb-2">
                        <span>{key.toUpperCase()}:</span>
                        <span>{formatCurrency(value)}</span>
                      </div>
                    )
                  ))}
                  <hr />
                  <div className="flex justify-content-between font-bold text-lg">
                    <span>Total Deductions:</span>
                    <span>{formatCurrency(viewingPayroll.calculations?.totalDeductions || 0)}</span>
                  </div>
                </Card>
              </div>

              <div className="col-12">
                <Card className="bg-primary">
                  <div className="flex justify-content-between align-items-center text-white">
                    <h3 className="m-0">Net Salary:</h3>
                    <h3 className="m-0">{formatCurrency(viewingPayroll.calculations?.netSalary || 0)}</h3>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Dialog>
      </div>
    </div>
  );
};

export default Payroll;
