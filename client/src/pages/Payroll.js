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
  const [isBulkPayslipDialogOpen, setIsBulkPayslipDialogOpen] = useState(false);
  const [bulkPayslips, setBulkPayslips] = useState([]);
  const [bulkPayslipMonth, setBulkPayslipMonth] = useState(new Date().getMonth() + 1);
  const [bulkPayslipYear, setBulkPayslipYear] = useState(new Date().getFullYear());
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [payslipPreviewOpen, setPayslipPreviewOpen] = useState(false);
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

  const generateBulkPayslips = async () => {
    try {
      setIsLoading(true);
      const data = await payrollService.bulkGeneratePayslips(bulkPayslipMonth, bulkPayslipYear);
      setBulkPayslips(data.payslips || []);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: `Generated ${data.count} payslips`
      });
    } catch (error) {
      console.error('Error generating bulk payslips:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to generate payslips'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewPayslip = (payslip) => {
    setSelectedPayslip(payslip);
    setPayslipPreviewOpen(true);
  };

  const downloadPayslip = (payslip) => {
    try {
      console.log('Downloading payslip for:', payslip.employee?.employeeId);
      
      if (!payslip.content) {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No payslip content to download'
        });
        return;
      }

      const blob = new Blob([payslip.content], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = `payslip-${payslip.employee.employeeId}-${bulkPayslipMonth || 'current'}-${bulkPayslipYear || new Date().getFullYear()}.html`;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Payslip downloaded:', fileName);
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to download payslip'
      });
    }
  };

  const downloadAllPayslips = () => {
    try {
      let successCount = 0;
      bulkPayslips.forEach((payslip, index) => {
        setTimeout(() => {
          try {
            downloadPayslip(payslip);
            successCount++;
          } catch (error) {
            console.error('Error downloading payslip:', error);
          }
        }, index * 500); // Delay between downloads
      });
      
      setTimeout(() => {
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: `Downloaded ${bulkPayslips.length} payslips`
        });
      }, bulkPayslips.length * 500 + 100);
    } catch (error) {
      console.error('Error downloading all payslips:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to download all payslips'
      });
    }
  };

  const printPayslip = (payslip) => {
    try {
      console.log('Printing payslip for:', payslip.employee?.employeeId);
      
      if (!payslip.content) {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No payslip content to print'
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
      
      printWindow.document.write(payslip.content);
      printWindow.document.close();
      
      // Wait for content to load before printing
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch (error) {
      console.error('Error printing payslip:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to print payslip'
      });
    }
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
              <div className="flex gap-2">
                <Button
                  label="Bulk Payslips"
                  icon="pi pi-file-pdf"
                  className="p-button-secondary"
                  onClick={() => setIsBulkPayslipDialogOpen(true)}
                />
                <Button
                  label="Generate Payroll"
                  icon="pi pi-calculator"
                  className="p-button-primary"
                  onClick={openCreate}
                />
              </div>
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
              <div className="field">
                <label htmlFor="employee" className="block text-sm font-medium mb-2">
                  Employee *
                </label>
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
              </div>
            </div>

            <div className="col-12 md:col-3">
              <div className="field">
                <label htmlFor="month" className="block text-sm font-medium mb-2">
                  Month *
                </label>
                <Dropdown 
                  id="month" 
                  className="w-full" 
                  value={formData.month} 
                  onChange={(e) => onFormChange('month', e.value)} 
                  options={monthOptions}
                />
              </div>
            </div>

            <div className="col-12 md:col-3">
              <div className="field">
                <label htmlFor="year" className="block text-sm font-medium mb-2">
                  Year *
                </label>
                <InputNumber 
                  id="year" 
                  className="w-full" 
                  value={formData.year} 
                  onValueChange={(e) => onFormChange('year', e.value)} 
                  useGrouping={false}
                />
              </div>
            </div>

            <div className="col-12">
              <h5>Basic Salary & Overtime</h5>
            </div>

            <div className="col-12 md:col-4">
              <div className="field">
                <label htmlFor="basicSalary" className="block text-sm font-medium mb-2">
                  Basic Salary *
                </label>
                <InputNumber 
                  id="basicSalary" 
                  className="w-full" 
                  value={formData.basicSalary} 
                  onValueChange={(e) => onFormChange('basicSalary', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
            </div>

            <div className="col-12 md:col-4">
              <div className="field">
                <label htmlFor="overtimeHours" className="block text-sm font-medium mb-2">
                  Overtime Hours
                </label>
                <InputNumber 
                  id="overtimeHours" 
                  className="w-full" 
                  value={formData.overtime.hours} 
                  onValueChange={(e) => onFormChange('overtime.hours', e.value)} 
                />
              </div>
            </div>

            <div className="col-12 md:col-4">
              <div className="field">
                <label htmlFor="overtimeRate" className="block text-sm font-medium mb-2">
                  Overtime Rate
                </label>
                <InputNumber 
                  id="overtimeRate" 
                  className="w-full" 
                  value={formData.overtime.rate} 
                  onValueChange={(e) => onFormChange('overtime.rate', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
            </div>

            <div className="col-12">
              <h5>Allowances</h5>
            </div>

            <div className="col-12 md:col-3">
              <div className="field">
                <label htmlFor="hra" className="block text-sm font-medium mb-2">
                  HRA
                </label>
                <InputNumber 
                  id="hra" 
                  className="w-full" 
                  value={formData.allowances.hra} 
                  onValueChange={(e) => onFormChange('allowances.hra', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
            </div>

            <div className="col-12 md:col-3">
              <div className="field">
                <label htmlFor="medical" className="block text-sm font-medium mb-2">
                  Medical
                </label>
                <InputNumber 
                  id="medical" 
                  className="w-full" 
                  value={formData.allowances.medical} 
                  onValueChange={(e) => onFormChange('allowances.medical', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
            </div>

            <div className="col-12 md:col-3">
              <div className="field">
                <label htmlFor="transport" className="block text-sm font-medium mb-2">
                  Transport
                </label>
                <InputNumber 
                  id="transport" 
                  className="w-full" 
                  value={formData.allowances.transport} 
                  onValueChange={(e) => onFormChange('allowances.transport', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
            </div>

            <div className="col-12 md:col-3">
              <div className="field">
                <label htmlFor="otherAllowances" className="block text-sm font-medium mb-2">
                  Other
                </label>
                <InputNumber 
                  id="otherAllowances" 
                  className="w-full" 
                  value={formData.allowances.other} 
                  onValueChange={(e) => onFormChange('allowances.other', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
            </div>

            <div className="col-12">
              <h5>Deductions</h5>
            </div>

            <div className="col-12 md:col-3">
              <div className="field">
                <label htmlFor="pf" className="block text-sm font-medium mb-2">
                  PF
                </label>
                <InputNumber 
                  id="pf" 
                  className="w-full" 
                  value={formData.deductions.pf} 
                  onValueChange={(e) => onFormChange('deductions.pf', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
            </div>

            <div className="col-12 md:col-3">
              <div className="field">
                <label htmlFor="esi" className="block text-sm font-medium mb-2">
                  ESI
                </label>
                <InputNumber 
                  id="esi" 
                  className="w-full" 
                  value={formData.deductions.esi} 
                  onValueChange={(e) => onFormChange('deductions.esi', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
            </div>

            <div className="col-12 md:col-3">
              <div className="field">
                <label htmlFor="tax" className="block text-sm font-medium mb-2">
                  Tax
                </label>
                <InputNumber 
                  id="tax" 
                  className="w-full" 
                  value={formData.deductions.tax} 
                  onValueChange={(e) => onFormChange('deductions.tax', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
            </div>

            <div className="col-12 md:col-3">
              <div className="field">
                <label htmlFor="otherDeductions" className="block text-sm font-medium mb-2">
                  Other
                </label>
                <InputNumber 
                  id="otherDeductions" 
                  className="w-full" 
                  value={formData.deductions.other} 
                  onValueChange={(e) => onFormChange('deductions.other', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
            </div>

            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="bonus" className="block text-sm font-medium mb-2">
                  Bonus
                </label>
                <InputNumber 
                  id="bonus" 
                  className="w-full" 
                  value={formData.bonus} 
                  onValueChange={(e) => onFormChange('bonus', e.value)} 
                  mode="currency" 
                  currency="INR"
                />
              </div>
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

        {/* Bulk Payslip Generation Dialog */}
        <Dialog
          header="Generate Bulk Payslips"
          visible={isBulkPayslipDialogOpen}
          style={{ width: '900px', height: '80vh' }}
          modal
          maximizable
          onHide={() => {
            setIsBulkPayslipDialogOpen(false);
            setBulkPayslips([]);
          }}
          footer={
            <div className="flex justify-content-between align-items-center">
              <div>
                {bulkPayslips.length > 0 && (
                  <Button
                    label={`Download All (${bulkPayslips.length})`}
                    icon="pi pi-download"
                    className="p-button-success"
                    onClick={downloadAllPayslips}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  label="Close"
                  icon="pi pi-times"
                  className="p-button-text"
                  onClick={() => {
                    setIsBulkPayslipDialogOpen(false);
                    setBulkPayslips([]);
                  }}
                />
              </div>
            </div>
          }
        >
          <div className="grid mb-4">
            <div className="col-6">
              <div className="field">
                <label htmlFor="bulkMonth" className="block text-sm font-medium mb-2">
                  Month *
                </label>
                <Dropdown
                  id="bulkMonth"
                  className="w-full"
                  value={bulkPayslipMonth}
                  onChange={(e) => setBulkPayslipMonth(e.value)}
                  options={monthOptions}
                />
              </div>
            </div>
            <div className="col-6">
              <div className="field">
                <label htmlFor="bulkYear" className="block text-sm font-medium mb-2">
                  Year *
                </label>
                <InputNumber
                  id="bulkYear"
                  className="w-full"
                  value={bulkPayslipYear}
                  onValueChange={(e) => setBulkPayslipYear(e.value)}
                  useGrouping={false}
                />
              </div>
            </div>
            <div className="col-12">
              <Button
                label="Generate Payslips"
                icon="pi pi-file-pdf"
                className="p-button-primary"
                onClick={generateBulkPayslips}
                loading={isLoading}
              />
            </div>
          </div>

          {bulkPayslips.length > 0 && (
            <div>
              <h4>Generated Payslips ({bulkPayslips.length})</h4>
              <DataTable
                value={bulkPayslips}
                paginator
                rows={10}
                className="p-datatable-sm"
                emptyMessage="No payslips generated"
              >
                <Column
                  field="employee.employeeId"
                  header="Employee ID"
                  sortable
                />
                <Column
                  field="employee.name"
                  header="Employee Name"
                  sortable
                />
                <Column
                  field="netSalary"
                  header="Net Salary"
                  body={(rowData) => formatCurrency(rowData.netSalary)}
                  sortable
                />
                <Column
                  header="Actions"
                  body={(rowData) => (
                    <div className="flex gap-2">
                      <Button
                        icon="pi pi-eye"
                        className="p-button-text p-button-sm"
                        tooltip="View"
                        onClick={() => viewPayslip(rowData)}
                      />
                      <Button
                        icon="pi pi-download"
                        className="p-button-text p-button-sm p-button-success"
                        tooltip="Download"
                        onClick={() => downloadPayslip(rowData)}
                      />
                      <Button
                        icon="pi pi-print"
                        className="p-button-text p-button-sm"
                        tooltip="Print"
                        onClick={() => printPayslip(rowData)}
                      />
                    </div>
                  )}
                  style={{ width: '150px' }}
                />
              </DataTable>
            </div>
          )}
        </Dialog>

        {/* Payslip Preview Dialog */}
        <Dialog
          header={`Payslip - ${selectedPayslip?.employee?.name || ''}`}
          visible={payslipPreviewOpen}
          style={{ width: '900px', height: '80vh' }}
          maximizable
          modal
          onHide={() => setPayslipPreviewOpen(false)}
          footer={
            <div className="flex justify-content-end gap-2">
              <Button
                label="Download"
                icon="pi pi-download"
                className="p-button-secondary"
                onClick={() => downloadPayslip(selectedPayslip)}
              />
              <Button
                label="Print"
                icon="pi pi-print"
                className="p-button-primary"
                onClick={() => printPayslip(selectedPayslip)}
              />
              <Button
                label="Close"
                icon="pi pi-times"
                className="p-button-text"
                onClick={() => setPayslipPreviewOpen(false)}
              />
            </div>
          }
        >
          {selectedPayslip && (
            <div
              style={{
                height: 'calc(80vh - 180px)',
                overflow: 'auto',
                border: '1px solid #ddd',
                padding: '20px',
                background: '#fff'
              }}
              dangerouslySetInnerHTML={{ __html: selectedPayslip.content }}
            />
          )}
        </Dialog>
      </div>
    </div>
  );
};

export default Payroll;
