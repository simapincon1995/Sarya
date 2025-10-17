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

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create'); // 'create' | 'edit'
  const [editingLeave, setEditingLeave] = useState(null);
  const [viewingLeave, setViewingLeave] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      setIsLoading(true);
      const data = await leaveService.getLeaves({ limit: 100 });
      setLeaves(data.leaves || []);
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
    setIsEditorOpen(true);
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
    setIsEditorOpen(true);
  };

  const openDetail = (row) => {
    setViewingLeave(row);
    setIsDetailOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingLeave(null);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setViewingLeave(null);
  };

  const onFormChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitForm = async () => {
    try {
      setIsSubmitting(true);
      if (editorMode === 'create') {
        await leaveService.applyLeave(formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Leave application submitted successfully'
        });
      } else if (editingLeave) {
        await leaveService.updateLeave(editingLeave._id, formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Leave application updated successfully'
        });
      }
      closeEditor();
      await loadLeaves();
    } catch (error) {
      console.error('Save leave failed:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save leave application'
      });
    } finally {
      setIsSubmitting(false);
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
      await loadLeaves();
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
            {hasPermission('apply_leaves') && (
              <Button
                label="Apply Leave"
                icon="pi pi-plus"
                className="p-button-primary"
                onClick={openCreate}
              />
            )}
          </div>

          <DataTable
            value={leaves}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25]}
            emptyMessage="No leave applications found"
            className="p-datatable-sm"
          >
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
                  {rowData.status === 'pending' && 
                   (hasPermission('apply_leaves') || rowData.employee === user?.id) && (
                    <>
                      <Button
                        icon="pi pi-pencil"
                        className="p-button-text p-button-sm"
                        tooltip="Edit"
                        onClick={() => openEdit(rowData)}
                      />
                      <Button
                        icon="pi pi-times"
                        className="p-button-text p-button-sm p-button-danger"
                        tooltip="Cancel"
                        onClick={() => confirmCancel(rowData)}
                      />
                      <Button
                        icon="pi pi-trash"
                        className="p-button-text p-button-sm p-button-danger"
                        tooltip="Delete"
                        onClick={() => confirmDelete(rowData)}
                      />
                    </>
                  )}
                </div>
              )}
              style={{ width: '150px' }}
            />
          </DataTable>
        </Card>

        {/* Leave Application Dialog */}
        <Dialog
          header={editorMode === 'create' ? 'Apply Leave' : 'Edit Leave Application'}
          visible={isEditorOpen}
          style={{ width: '600px' }}
          modal
          onHide={closeEditor}
          footer={
            <div className="flex justify-content-end gap-2">
              <Button label="Cancel" className="p-button-text" onClick={closeEditor} />
              <Button 
                label={editorMode === 'create' ? 'Apply' : 'Update'} 
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
                  id="leaveType" 
                  className="w-full" 
                  value={formData.leaveType} 
                  onChange={(e) => onFormChange('leaveType', e.value)} 
                  options={leaveTypeOptions} 
                />
                <label htmlFor="leaveType">Leave Type *</label>
              </span>
            </div>
            
            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <Calendar 
                  id="startDate" 
                  className="w-full" 
                  value={formData.startDate} 
                  onChange={(e) => onFormChange('startDate', e.value)} 
                  showIcon 
                  dateFormat="dd/mm/yy"
                  minDate={new Date()}
                />
                <label htmlFor="startDate">Start Date *</label>
              </span>
            </div>

            <div className="col-12 md:col-6">
              <span className="p-float-label w-full">
                <Calendar 
                  id="endDate" 
                  className="w-full" 
                  value={formData.endDate} 
                  onChange={(e) => onFormChange('endDate', e.value)} 
                  showIcon 
                  dateFormat="dd/mm/yy"
                  minDate={formData.startDate || new Date()}
                />
                <label htmlFor="endDate">End Date *</label>
              </span>
            </div>

            {formData.isHalfDay && (
              <div className="col-12 md:col-6">
                <span className="p-float-label w-full">
                  <Dropdown 
                    id="halfDayPeriod" 
                    className="w-full" 
                    value={formData.halfDayPeriod} 
                    onChange={(e) => onFormChange('halfDayPeriod', e.value)} 
                    options={halfDayOptions} 
                  />
                  <label htmlFor="halfDayPeriod">Half Day Period</label>
                </span>
              </div>
            )}

            <div className="col-12">
              <span className="p-float-label w-full">
                <InputTextarea 
                  id="reason" 
                  className="w-full" 
                  value={formData.reason} 
                  onChange={(e) => onFormChange('reason', e.target.value)} 
                  rows={4}
                  maxLength={500}
                />
                <label htmlFor="reason">Reason for Leave *</label>
              </span>
            </div>
          </div>
        </Dialog>

        {/* Leave Detail Dialog */}
        <Dialog
          header="Leave Application Details"
          visible={isDetailOpen}
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
      </div>
    </div>
  );
};

export default Leaves;
