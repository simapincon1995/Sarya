import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { holidayService } from '../services/holidayService';

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create'); // 'create' | 'edit'
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [viewingHoliday, setViewingHoliday] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: null,
    type: '',
    description: '',
    isPaid: true,
    isActive: true
  });
  const { hasPermission } = useAuth();
  const toast = React.useRef(null);

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      setIsLoading(true);
      const data = await holidayService.getHolidays({ limit: 100 });
      setHolidays(data.holidays || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load holidays'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditorMode('create');
    setEditingHoliday(null);
    setFormData({
      name: '',
      date: null,
      type: '',
      description: '',
      isPaid: true,
      isActive: true
    });
    setIsEditorOpen(true);
  };

  const openEdit = (row) => {
    setEditorMode('edit');
    setEditingHoliday(row);
    setFormData({
      name: row.name || '',
      date: row.date ? new Date(row.date) : null,
      type: row.type || '',
      description: row.description || '',
      isPaid: row.isPaid !== undefined ? row.isPaid : true,
      isActive: row.isActive !== undefined ? row.isActive : true
    });
    setIsEditorOpen(true);
  };

  const openDetail = (row) => {
    setViewingHoliday(row);
    setIsDetailOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingHoliday(null);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setViewingHoliday(null);
  };

  const onFormChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitForm = async () => {
    try {
      setIsSubmitting(true);
      if (editorMode === 'create') {
        await holidayService.createHoliday(formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Holiday created successfully'
        });
      } else if (editingHoliday) {
        await holidayService.updateHoliday(editingHoliday._id, formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Holiday updated successfully'
        });
      }
      closeEditor();
      await loadHolidays();
    } catch (error) {
      console.error('Save holiday failed:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save holiday'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteHoliday = async (row) => {
    try {
      await holidayService.deleteHoliday(row._id);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Holiday deleted successfully'
      });
      await loadHolidays();
    } catch (error) {
      console.error('Delete holiday failed:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete holiday'
      });
    }
  };

  const confirmDelete = (row) => {
    confirmDialog({
      message: 'Are you sure you want to delete this holiday?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deleteHoliday(row)
    });
  };

  const holidayTypeOptions = [
    { label: 'National', value: 'national' },
    { label: 'Regional', value: 'regional' },
    { label: 'Company', value: 'company' },
    { label: 'Religious', value: 'religious' },
    { label: 'Observance', value: 'observance' }
  ];

  const getTypeBadge = (type) => {
    const typeConfig = {
      national: { severity: 'success', label: 'National' },
      regional: { severity: 'info', label: 'Regional' },
      company: { severity: 'warning', label: 'Company' },
      religious: { severity: 'help', label: 'Religious' },
      observance: { severity: 'secondary', label: 'Observance' }
    };

    const config = typeConfig[type] || { severity: 'secondary', label: type };
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading holidays..." />;
  }

  return (
    <div className="grid">
      <Toast ref={toast} />
      <ConfirmDialog />
      <div className="col-12">
        <Card>
          <div className="flex justify-content-between align-items-center mb-4">
            <h2 className="text-2xl font-bold m-0">Holiday Calendar</h2>
            {hasPermission('manage_holidays') && (
              <Button
                label="Add Holiday"
                icon="pi pi-plus"
                className="p-button-primary"
                onClick={openCreate}
              />
            )}
          </div>

          <DataTable
            value={holidays}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25]}
            emptyMessage="No holidays found"
            className="p-datatable-sm"
          >
            <Column
              field="name"
              header="Holiday Name"
              sortable
            />
            <Column
              field="date"
              header="Date"
              body={(rowData) => formatDate(rowData.date)}
              sortable
            />
            <Column
              field="type"
              header="Type"
              body={(rowData) => getTypeBadge(rowData.type)}
              sortable
            />
            <Column
              field="description"
              header="Description"
              style={{ maxWidth: '200px' }}
              body={(rowData) => (
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rowData.description}
                </div>
              )}
            />
            <Column
              field="isPaid"
              header="Paid"
              body={(rowData) => (
                <Tag
                  value={rowData.isPaid ? 'Yes' : 'No'}
                  severity={rowData.isPaid ? 'success' : 'secondary'}
                />
              )}
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
                    onClick={() => openDetail(rowData)}
                  />
                  {hasPermission('manage_holidays') && (
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

        {/* Holiday Editor Dialog */}
        <Dialog
          header={editorMode === 'create' ? 'Add Holiday' : 'Edit Holiday'}
          visible={isEditorOpen}
          style={{ width: '600px' }}
          modal
          onHide={closeEditor}
          footer={
            <div className="flex justify-content-end gap-2">
              <Button label="Cancel" className="p-button-text" onClick={closeEditor} />
              <Button 
                label={editorMode === 'create' ? 'Add' : 'Update'} 
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
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Holiday Name *
                </label>
                <InputText 
                  id="name" 
                  className="w-full" 
                  value={formData.name} 
                  onChange={(e) => onFormChange('name', e.target.value)} 
                />
              </div>
            </div>

            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="date" className="block text-sm font-medium mb-2">
                  Date *
                </label>
                <Calendar 
                  id="date" 
                  className="w-full" 
                  value={formData.date} 
                  onChange={(e) => onFormChange('date', e.value)} 
                  showIcon 
                  dateFormat="dd/mm/yy"
                />
              </div>
            </div>

            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="type" className="block text-sm font-medium mb-2">
                  Holiday Type *
                </label>
                <Dropdown 
                  id="type" 
                  className="w-full" 
                  value={formData.type} 
                  onChange={(e) => onFormChange('type', e.value)} 
                  options={holidayTypeOptions}
                />
              </div>
            </div>

            <div className="col-12 md:col-6">
              <div className="flex gap-4 align-items-center">
                <div className="field-checkbox">
                  <Checkbox 
                    id="isPaid" 
                    checked={formData.isPaid} 
                    onChange={(e) => onFormChange('isPaid', e.checked)} 
                  />
                  <label htmlFor="isPaid" className="ml-2">Paid Holiday</label>
                </div>
                <div className="field-checkbox">
                  <Checkbox 
                    id="isActive" 
                    checked={formData.isActive} 
                    onChange={(e) => onFormChange('isActive', e.checked)} 
                  />
                  <label htmlFor="isActive" className="ml-2">Active</label>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="field">
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <InputTextarea 
                  id="description" 
                  className="w-full" 
                  value={formData.description} 
                  onChange={(e) => onFormChange('description', e.target.value)} 
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
          </div>
        </Dialog>

        {/* Holiday Detail Dialog */}
        <Dialog
          header="Holiday Details"
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
          {viewingHoliday && (
            <div className="grid">
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Holiday Name:</strong>
                  <div className="mt-1">{viewingHoliday.name}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Date:</strong>
                  <div className="mt-1">{formatDate(viewingHoliday.date)}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Type:</strong>
                  <div className="mt-1">{getTypeBadge(viewingHoliday.type)}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Status:</strong>
                  <div className="mt-1">{getStatusBadge(viewingHoliday.isActive)}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Paid Holiday:</strong>
                  <div className="mt-1">
                    <Tag
                      value={viewingHoliday.isPaid ? 'Yes' : 'No'}
                      severity={viewingHoliday.isPaid ? 'success' : 'secondary'}
                    />
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <strong>Description:</strong>
                  <div className="mt-1 p-3 surface-100 border-round">
                    {viewingHoliday.description || 'No description provided'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Dialog>
      </div>
    </div>
  );
};

export default Holidays;
