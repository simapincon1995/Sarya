import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { leaveService } from '../services/leaveService';
import { usePopupState, useFormSubmission } from '../hooks/usePopupState';

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [ownLeaves, setOwnLeaves] = useState([]);
  const [reporteeLeaves, setReporteeLeaves] = useState([]);
  const [selectedView, setSelectedView] = useState('own');
  const [isLoading, setIsLoading] = useState(true);
  
  // Use custom popup hooks for better state management
  const editorPopup = usePopupState(false);
  const detailPopup = usePopupState(false);
  const { submitForm } = useFormSubmission(editorPopup);
  
  const [editorMode, setEditorMode] = useState('create'); // 'create' | 'edit'
  const [editingLeave, setEditingLeave] = useState(null);
  const [viewingLeave, setViewingLeave] = useState(null);
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: null,
    endDate: null,
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'morning'
  });
  const { hasPermission, user } = useAuth();
  const toast = React.useRef(null);
  const isManagerOrAdmin = ['manager', 'hr_admin', 'admin'].includes(user?.role);

  const loadLeaves = async (tab = null) => {
    try {
      setIsLoading(true);
      // Remove limit to get all records, or use a very large limit
      const params = { limit: 10000, page: 1 };
      if (tab) {
        params.tab = tab;
      }
      const data = await leaveService.getLeaves(params);
      
      if (data.hasTabs) {
        // Manager/Admin/HR Admin - has tabs
        // Update the specific tab's data if tab is specified, otherwise update both
        if (tab === 'own') {
          setOwnLeaves(data.ownLeaves || []);
        } else if (tab === 'reportees') {
          setReporteeLeaves(data.reporteeLeaves || []);
        } else {
          // No tab specified - load both tabs
          setOwnLeaves(data.ownLeaves || []);
          setReporteeLeaves(data.reporteeLeaves || []);
        }
      } else {
        // Regular employee - no tabs
        setLeaves(data.leaves || []);
        setOwnLeaves([]);
        setReporteeLeaves([]);
      }
    } catch (error) {
      console.error('Error loading leaves:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load leaves'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load - fetch both tabs if manager/admin
  useEffect(() => {
    if (isManagerOrAdmin) {
      // Load both tabs on initial mount (no tab param loads both)
      loadLeaves();
    } else {
      loadLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when view changes (only for manager/admin, skip initial mount)
  const isMountedRef = React.useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (isManagerOrAdmin) {
      const tab = selectedView === 'own' ? 'own' : 'reportees';
      loadLeaves(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedView]);

  const openCreate = () => {
    setEditorMode('create');
    setEditingLeave(null);
    setFormData({
      leaveType: '',
      startDate: null,
      endDate: null,
      reason: '',
      isHalfDay: false,
      halfDayPeriod: 'morning'
    });
    editorPopup.openPopup();
  };

  const openEdit = (row) => {
    setEditorMode('edit');
    setEditingLeave(row);
    setFormData({
      leaveType: row.leaveType || '',
      startDate: row.startDate ? new Date(row.startDate) : null,
      endDate: row.endDate ? new Date(row.endDate) : null,
      reason: row.reason || '',
      isHalfDay: row.isHalfDay || false,
      halfDayPeriod: row.halfDayPeriod || 'morning'
    });
    editorPopup.openPopup();
  };

  const openDetail = (row) => {
    setViewingLeave(row);
    detailPopup.openPopup();
  };

  const closeEditor = () => {
    editorPopup.closePopup();
    setEditingLeave(null);
  };

  const closeDetail = () => {
    detailPopup.closePopup();
    setViewingLeave(null);
  };

  const onFormChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitForm = async () => {
    // Validate required fields
    if (!formData.leaveType) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select a leave type'
      });
      return;
    }

    if (!formData.startDate) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select a start date'
      });
      return;
    }

    if (!formData.endDate) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select an end date'
      });
      return;
    }

    if (!formData.reason || formData.reason.trim() === '') {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please provide a reason for leave'
      });
      return;
    }

    // Validate date logic
    if (formData.startDate >= formData.endDate) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'End date must be after start date'
      });
      return;
    }

    // Prepare data for submission
    const submitData = {
      leaveType: formData.leaveType,
      startDate: formData.startDate.toISOString().split('T')[0],
      endDate: formData.endDate.toISOString().split('T')[0],
      reason: formData.reason.trim(),
      isHalfDay: formData.isHalfDay,
      halfDayPeriod: formData.halfDayPeriod
    };

    try {
      await submitForm(async () => {
        if (editorMode === 'create') {
          await leaveService.applyLeave(submitData);
          toast.current?.show({
            severity: 'success',
            summary: 'Success',
            detail: 'Leave application submitted successfully'
          });
        } else if (editingLeave) {
          await leaveService.updateLeave(editingLeave._id, submitData);
          toast.current?.show({
            severity: 'success',
            summary: 'Success',
            detail: 'Leave application updated successfully'
          });
        }
      }, async () => {
        // Reload leaves based on current view
        if (isManagerOrAdmin) {
          // Load both tabs to ensure data is fresh
          await loadLeaves();
        } else {
          await loadLeaves();
        }
      });
    } catch (error) {
      // Error is already handled by the hook, but we can add additional handling here if needed
      console.error('Leave submission error:', error);
    }
  };

  const cancelLeave = async (row) => {
    try {
      await leaveService.cancelLeave(row._id);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Leave cancelled successfully'
      });
      const tab = isManagerOrAdmin ? (selectedView === 'own' ? 'own' : 'reportees') : null;
      await loadLeaves(tab);
    } catch (error) {
      console.error('Cancel leave failed:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to cancel leave'
      });
    }
  };

  const confirmCancel = (row) => {
    confirmDialog({
      message: 'Are you sure you want to cancel this leave application?',
      header: 'Confirm Cancellation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => cancelLeave(row)
    });
  };

  const deleteLeave = async (row) => {
    try {
      await leaveService.deleteLeave(row._id);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Leave application deleted successfully'
      });
      await loadLeaves();
    } catch (error) {
      console.error('Delete leave failed:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete leave application'
      });
    }
  };

  const confirmDelete = (row) => {
    confirmDialog({
      message: 'Are you sure you want to delete this leave application? This action cannot be undone.',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => deleteLeave(row)
    });
  };

  // Approve/Reject functionality
  const approvalPopup = usePopupState(false);
  const [approvalData, setApprovalData] = useState({ leave: null, action: null, rejectionReason: '' });

  const openApprovalDialog = (leave, action) => {
    setApprovalData({ leave, action, rejectionReason: '' });
    approvalPopup.openPopup();
  };

  const closeApprovalDialog = () => {
    approvalPopup.closePopup();
    setApprovalData({ leave: null, action: null, rejectionReason: '' });
  };

  const handleApproveReject = async () => {
    if (!approvalData.leave) return;

    if (approvalData.action === 'reject' && !approvalData.rejectionReason.trim()) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please provide a reason for rejection'
      });
      return;
    }

    try {
      await submitForm(async () => {
        await leaveService.approveLeave(
          approvalData.leave._id,
          approvalData.action,
          approvalData.action === 'reject' ? approvalData.rejectionReason : null
        );
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: `Leave ${approvalData.action === 'approved' ? 'approved' : 'rejected'} successfully`
        });
      }, async () => {
        // Reload both tabs to ensure data is fresh
        if (isManagerOrAdmin) {
          await loadLeaves(); // Load both tabs
        } else {
          await loadLeaves();
        }
      });
      closeApprovalDialog();
    } catch (error) {
      console.error('Approve/Reject leave error:', error);
    }
  };

  const leaveTypeOptions = [
    { label: 'Casual', value: 'casual' },
    { label: 'Sick', value: 'sick' },
    { label: 'Earned', value: 'earned' },
    { label: 'Maternity', value: 'maternity' },
    { label: 'Paternity', value: 'paternity' },
    { label: 'Emergency', value: 'emergency' },
    { label: 'Unpaid', value: 'unpaid' }
  ];

  const halfDayOptions = [
    { label: 'Morning', value: 'morning' },
    { label: 'Afternoon', value: 'afternoon' }
  ];

  const getLeaveTypeBadge = (type) => {
    const typeConfig = {
      casual: { severity: 'info', label: 'Casual' },
      sick: { severity: 'warning', label: 'Sick' },
      earned: { severity: 'success', label: 'Earned' },
      maternity: { severity: 'help', label: 'Maternity' },
      paternity: { severity: 'help', label: 'Paternity' },
      emergency: { severity: 'danger', label: 'Emergency' },
      unpaid: { severity: 'secondary', label: 'Unpaid' }
    };

    const config = typeConfig[type] || { severity: 'secondary', label: type };
    return <Tag value={config.label} severity={config.severity} />;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { severity: 'warning', label: 'Pending' },
      approved: { severity: 'success', label: 'Approved' },
      rejected: { severity: 'danger', label: 'Rejected' },
      cancelled: { severity: 'secondary', label: 'Cancelled' }
    };

    const config = statusConfig[status] || { severity: 'secondary', label: status };
    return <Tag value={config.label} severity={config.severity} />;
  };

  const renderDataTable = (tableLeaves, showEmployee = false, showApprovalActions = false) => {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    
    return (
      <DataTable
        value={tableLeaves || []}
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25]}
        emptyMessage="No leave applications found"
        className="p-datatable-sm"
      >
      {showEmployee && (
        <Column
          header="Employee"
          body={(rowData) => (
            <div>
              <div className="font-medium">
                {rowData.employee?.firstName} {rowData.employee?.lastName}
              </div>
              <div className="text-sm text-color-secondary">
                {rowData.employee?.employeeId} - {rowData.employee?.department}
              </div>
            </div>
          )}
          sortable
          style={{ minWidth: '200px' }}
        />
      )}
      <Column
        field="leaveType"
        header="Type"
        body={(rowData) => getLeaveTypeBadge(rowData.leaveType)}
        sortable
      />
      <Column
        field="startDate"
        header="Start Date"
        body={(rowData) => new Date(rowData.startDate).toLocaleDateString()}
        sortable
      />
      <Column
        field="endDate"
        header="End Date"
        body={(rowData) => new Date(rowData.endDate).toLocaleDateString()}
        sortable
      />
      <Column
        field="totalDays"
        header="Days"
        sortable
      />
      <Column
        field="reason"
        header="Reason"
        style={{ maxWidth: '200px' }}
        body={(rowData) => (
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {rowData.reason}
          </div>
        )}
      />
      <Column
        field="status"
        header="Status"
        body={(rowData) => getStatusBadge(rowData.status)}
        sortable
      />
      <Column
        field="appliedDate"
        header="Applied Date"
        body={(rowData) => new Date(rowData.appliedDate).toLocaleDateString()}
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
            {showApprovalActions && rowData.status === 'pending' && (
              <>
                <Button
                  icon="pi pi-check"
                  className="p-button-text p-button-sm p-button-success"
                  tooltip="Approve"
                  onClick={() => openApprovalDialog(rowData, 'approved')}
                />
                <Button
                  icon="pi pi-times"
                  className="p-button-text p-button-sm p-button-danger"
                  tooltip="Reject"
                  onClick={() => openApprovalDialog(rowData, 'rejected')}
                />
              </>
            )}
            {!showApprovalActions && (hasPermission('manage_leaves') || 
              (rowData.status === 'pending' && (hasPermission('apply_leaves') || rowData.employee?._id === user?.id || rowData.employee === user?.id))) && (
              <>
                {(hasPermission('manage_leaves') || (rowData.status === 'pending' && (rowData.employee?._id === user?.id || rowData.employee === user?.id))) && (
                  <Button
                    icon="pi pi-pencil"
                    className="p-button-text p-button-sm"
                    tooltip="Edit"
                    onClick={() => openEdit(rowData)}
                  />
                )}
                {rowData.status === 'pending' && 
                 (hasPermission('apply_leaves') || rowData.employee?._id === user?.id || rowData.employee === user?.id) && (
                  <Button
                    icon="pi pi-times"
                    className="p-button-text p-button-sm p-button-danger"
                    tooltip="Cancel"
                    onClick={() => confirmCancel(rowData)}
                  />
                )}
                {(hasPermission('manage_leaves') || 
                  (rowData.status === 'pending' && (hasPermission('apply_leaves') || rowData.employee?._id === user?.id || rowData.employee === user?.id))) && (
                  <Button
                    icon="pi pi-trash"
                    className="p-button-text p-button-sm p-button-danger"
                    tooltip="Delete"
                    onClick={() => confirmDelete(rowData)}
                  />
                )}
              </>
            )}
          </div>
        )}
        style={{ width: showApprovalActions ? '200px' : '150px' }}
      />
    </DataTable>
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading leaves..." />;
  }

  return (
    <div className="grid">
      <Toast ref={toast} />
      <ConfirmDialog />
      <div className="col-12">
        <Card>
          <div className="flex justify-content-between align-items-center mb-4">
            <h2 className="text-2xl font-bold m-0">Leave Management</h2>
            <div className="flex align-items-center gap-3">
              {isManagerOrAdmin && (
                <Dropdown
                  value={selectedView}
                  options={[
                    { label: 'Own Leaves', value: 'own' },
                    { label: 'Reportee Leaves', value: 'reportees' }
                  ]}
                  onChange={(e) => setSelectedView(e.value)}
                  placeholder="Select View"
                  style={{ minWidth: '200px' }}
                />
              )}
              {hasPermission('apply_leaves') && (
                <Button
                  label="Apply Leave"
                  icon="pi pi-plus"
                  className="p-button-primary"
                  onClick={openCreate}
                />
              )}
            </div>
          </div>

          {isManagerOrAdmin ? (
            selectedView === 'own' ? (
              renderDataTable(ownLeaves, false, false)
            ) : (
              renderDataTable(reporteeLeaves, true, true)
            )
          ) : (
            renderDataTable(leaves, false, false)
          )}
        </Card>

        {/* Leave Application Dialog */}
        <Dialog
          header={editorMode === 'create' ? 'Apply Leave' : 'Edit Leave Application'}
          visible={editorPopup.isOpen}
          style={{ width: '600px' }}
          modal
          onHide={closeEditor}
          footer={
            <div className="flex justify-content-end gap-2">
              <Button 
                label="Cancel" 
                className="p-button-text" 
                onClick={closeEditor}
                disabled={editorPopup.isLoading}
              />
              <Button 
                label={editorMode === 'create' ? 'Apply' : 'Update'} 
                icon="pi pi-check" 
                loading={editorPopup.isLoading} 
                onClick={handleSubmitForm}
                disabled={editorPopup.isLoading}
              />
            </div>
          }
        >
          {editorPopup.error && (
            <div className="mb-3 p-3 border-round surface-100 border-1 border-red-200">
              <div className="flex align-items-center gap-2 text-red-600">
                <i className="pi pi-exclamation-triangle"></i>
                <span className="font-medium">Error:</span>
                <span>{editorPopup.error}</span>
              </div>
            </div>
          )}
          <div className="grid">
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="leaveType" className="block text-sm font-medium mb-2">
                  Leave Type *
                </label>
                <Dropdown 
                  id="leaveType" 
                  className="w-full" 
                  value={formData.leaveType} 
                  onChange={(e) => onFormChange('leaveType', e.value)} 
                  options={leaveTypeOptions} 
                />
              </div>
            </div>
            
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                  Start Date *
                </label>
                <Calendar 
                  id="startDate" 
                  className="w-full" 
                  value={formData.startDate} 
                  onChange={(e) => onFormChange('startDate', e.value)} 
                  showIcon 
                  dateFormat="dd/mm/yy"
                  minDate={new Date()}
                />
              </div>
            </div>

            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                  End Date *
                </label>
                <Calendar 
                  id="endDate" 
                  className="w-full" 
                  value={formData.endDate} 
                  onChange={(e) => onFormChange('endDate', e.value)} 
                  showIcon 
                  dateFormat="dd/mm/yy"
                  minDate={formData.startDate || new Date()}
                />
              </div>
            </div>

            <div className="col-12 md:col-6">
              <div className="field">
                <div className="flex align-items-center gap-2">
                  <input
                    type="checkbox"
                    id="isHalfDay"
                    checked={formData.isHalfDay}
                    onChange={(e) => onFormChange('isHalfDay', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="isHalfDay" className="text-sm font-medium">
                    Half Day Leave
                  </label>
                </div>
              </div>
            </div>

            {formData.isHalfDay && (
              <div className="col-12 md:col-6">
                <div className="field">
                  <label htmlFor="halfDayPeriod" className="block text-sm font-medium mb-2">
                    Half Day Period
                  </label>
                  <Dropdown 
                    id="halfDayPeriod" 
                    className="w-full" 
                    value={formData.halfDayPeriod} 
                    onChange={(e) => onFormChange('halfDayPeriod', e.value)} 
                    options={halfDayOptions} 
                  />
                </div>
              </div>
            )}

            <div className="col-12">
              <div className="field">
                <label htmlFor="reason" className="block text-sm font-medium mb-2">
                  Reason for Leave *
                </label>
                <InputTextarea 
                  id="reason" 
                  className="w-full" 
                  value={formData.reason} 
                  onChange={(e) => onFormChange('reason', e.target.value)} 
                  rows={4}
                  maxLength={500}
                />
              </div>
            </div>
          </div>
        </Dialog>

        {/* Leave Detail Dialog */}
        <Dialog
          header="Leave Application Details"
          visible={detailPopup.isOpen}
          style={{ width: '600px' }}
          modal
          onHide={closeDetail}
          footer={
            <div className="flex justify-content-end">
              <Button label="Close" className="p-button-text" onClick={closeDetail} />
            </div>
          }
        >
          {viewingLeave && (
            <div className="grid">
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Leave Type:</strong>
                  <div className="mt-1">{getLeaveTypeBadge(viewingLeave.leaveType)}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Status:</strong>
                  <div className="mt-1">{getStatusBadge(viewingLeave.status)}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Start Date:</strong>
                  <div>{new Date(viewingLeave.startDate).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>End Date:</strong>
                  <div>{new Date(viewingLeave.endDate).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Total Days:</strong>
                  <div>{viewingLeave.totalDays}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Applied Date:</strong>
                  <div>{new Date(viewingLeave.appliedDate).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <strong>Reason:</strong>
                  <div className="mt-1 p-3 surface-100 border-round">
                    {viewingLeave.reason}
                  </div>
                </div>
              </div>
              {viewingLeave.rejectionReason && (
                <div className="col-12">
                  <div className="mb-3">
                    <strong>Rejection Reason:</strong>
                    <div className="mt-1 p-3 surface-100 border-round text-red-600">
                      {viewingLeave.rejectionReason}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Dialog>

        {/* Approve/Reject Leave Dialog */}
        <Dialog
          header={approvalData.action === 'approved' ? 'Approve Leave' : 'Reject Leave'}
          visible={approvalPopup.isOpen}
          style={{ width: '500px' }}
          modal
          onHide={closeApprovalDialog}
          footer={
            <div className="flex justify-content-end gap-2">
              <Button
                label="Cancel"
                className="p-button-text"
                onClick={closeApprovalDialog}
                disabled={approvalPopup.isLoading}
              />
              <Button
                label={approvalData.action === 'approved' ? 'Approve' : 'Reject'}
                icon={approvalData.action === 'approved' ? 'pi pi-check' : 'pi pi-times'}
                className={approvalData.action === 'approved' ? 'p-button-success' : 'p-button-danger'}
                loading={approvalPopup.isLoading}
                onClick={handleApproveReject}
                disabled={approvalPopup.isLoading}
              />
            </div>
          }
        >
          {approvalData.leave && (
            <div className="grid">
              <div className="col-12">
                <div className="mb-3">
                  <strong>Employee:</strong>
                  <div className="mt-1">
                    {approvalData.leave.employee?.firstName} {approvalData.leave.employee?.lastName} ({approvalData.leave.employee?.employeeId})
                  </div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Leave Type:</strong>
                  <div className="mt-1">{getLeaveTypeBadge(approvalData.leave.leaveType)}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Total Days:</strong>
                  <div className="mt-1">{approvalData.leave.totalDays}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Start Date:</strong>
                  <div className="mt-1">{new Date(approvalData.leave.startDate).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>End Date:</strong>
                  <div className="mt-1">{new Date(approvalData.leave.endDate).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <strong>Reason:</strong>
                  <div className="mt-1 p-3 surface-100 border-round">
                    {approvalData.leave.reason}
                  </div>
                </div>
              </div>
              {approvalData.action === 'rejected' && (
                <div className="col-12">
                  <div className="field">
                    <label htmlFor="rejectionReason" className="block text-sm font-medium mb-2">
                      Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <InputTextarea
                      id="rejectionReason"
                      className="w-full"
                      value={approvalData.rejectionReason}
                      onChange={(e) => setApprovalData({ ...approvalData, rejectionReason: e.target.value })}
                      rows={4}
                      placeholder="Please provide a reason for rejection"
                      maxLength={500}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Dialog>
      </div>
    </div>
  );
};

export default Leaves;
