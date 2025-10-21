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
import { Checkbox } from 'primereact/checkbox';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { templateService } from '../services/templateService';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create'); // 'create' | 'edit'
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    content: '',
    variables: [],
    isActive: true,
    isDefault: false
  });
  const { hasPermission } = useAuth();
  const toast = React.useRef(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await templateService.getTemplates({ limit: 100 });
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load templates'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditorMode('create');
    setEditingTemplate(null);
    setFormData({
      name: '',
      type: '',
      description: '',
      content: '',
      variables: [],
      isActive: true,
      isDefault: false
    });
    setIsEditorOpen(true);
  };

  const openEdit = (row) => {
    setEditorMode('edit');
    setEditingTemplate(row);
    setFormData({
      name: row.name || '',
      type: row.type || '',
      description: row.description || '',
      content: row.content || '',
      variables: row.variables || [],
      isActive: row.isActive !== undefined ? row.isActive : true,
      isDefault: row.isDefault || false
    });
    setIsEditorOpen(true);
  };

  const openDetail = (row) => {
    setViewingTemplate(row);
    setIsDetailOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setViewingTemplate(null);
  };

  const onFormChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitForm = async () => {
    try {
      setIsSubmitting(true);
      if (editorMode === 'create') {
        await templateService.createTemplate(formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Template created successfully'
        });
      } else if (editingTemplate) {
        await templateService.updateTemplate(editingTemplate._id, formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Template updated successfully'
        });
      }
      closeEditor();
      await loadTemplates();
    } catch (error) {
      console.error('Save template failed:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save template'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTemplate = async (row) => {
    try {
      await templateService.deleteTemplate(row._id);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Template deleted successfully'
      });
      await loadTemplates();
    } catch (error) {
      console.error('Delete template failed:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete template'
      });
    }
  };

  const duplicateTemplate = async (row) => {
    try {
      await templateService.duplicateTemplate(row._id);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Template duplicated successfully'
      });
      await loadTemplates();
    } catch (error) {
      console.error('Duplicate template failed:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to duplicate template'
      });
    }
  };

  const confirmDelete = (row) => {
    confirmDialog({
      message: 'Are you sure you want to delete this template?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deleteTemplate(row)
    });
  };

  const templateTypeOptions = [
    { label: 'Offer Letter', value: 'offer_letter' },
    { label: 'Payslip', value: 'payslip' },
    { label: 'Appointment Letter', value: 'appointment_letter' },
    { label: 'Contract', value: 'contract' },
    { label: 'Other', value: 'other' }
  ];

  const getTypeBadge = (type) => {
    const typeConfig = {
      offer_letter: { severity: 'success', label: 'Offer Letter' },
      payslip: { severity: 'info', label: 'Payslip' },
      appointment_letter: { severity: 'warning', label: 'Appointment Letter' },
      contract: { severity: 'help', label: 'Contract' },
      other: { severity: 'secondary', label: 'Other' }
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

  if (isLoading) {
    return <LoadingSpinner message="Loading templates..." />;
  }

  return (
    <div className="grid">
      <Toast ref={toast} />
      <ConfirmDialog />
      <div className="col-12">
        <Card>
          <div className="flex justify-content-between align-items-center mb-4">
            <h2 className="text-2xl font-bold m-0">Template Management</h2>
            {hasPermission('manage_templates') && (
              <Button
                label="Create Template"
                icon="pi pi-plus"
                className="p-button-primary"
                onClick={openCreate}
              />
            )}
          </div>

          <DataTable
            value={templates}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25]}
            emptyMessage="No templates found"
            className="p-datatable-sm"
          >
            <Column
              field="name"
              header="Name"
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
              field="usageCount"
              header="Usage Count"
              sortable
            />
            <Column
              field="isActive"
              header="Status"
              body={(rowData) => getStatusBadge(rowData.isActive)}
              sortable
            />
            <Column
              field="isDefault"
              header="Default"
              body={(rowData) => (
                <Tag
                  value={rowData.isDefault ? 'Yes' : 'No'}
                  severity={rowData.isDefault ? 'info' : 'secondary'}
                />
              )}
              sortable
            />
            <Column
              header="Actions"
              body={(rowData) => (
                <div className="flex gap-2">
                  <Button
                    icon="pi pi-eye"
                    className="p-button-text p-button-sm"
                    tooltip="View Template"
                    onClick={() => openDetail(rowData)}
                  />
                  {hasPermission('manage_templates') && (
                    <>
                      <Button
                        icon="pi pi-pencil"
                        className="p-button-text p-button-sm"
                        tooltip="Edit"
                        onClick={() => openEdit(rowData)}
                      />
                      <Button
                        icon="pi pi-copy"
                        className="p-button-text p-button-sm"
                        tooltip="Duplicate"
                        onClick={() => duplicateTemplate(rowData)}
                      />
                      {!rowData.isDefault && (
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
              style={{ width: '200px' }}
            />
          </DataTable>
        </Card>

        {/* Template Editor Dialog */}
        <Dialog
          header={editorMode === 'create' ? 'Create Template' : 'Edit Template'}
          visible={isEditorOpen}
          style={{ width: '800px', height: '80vh' }}
          modal
          maximizable
          onHide={closeEditor}
          footer={
            <div className="flex justify-content-end gap-2">
              <Button label="Cancel" className="p-button-text" onClick={closeEditor} />
              <Button 
                label={editorMode === 'create' ? 'Create' : 'Update'} 
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
                  Template Name *
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
                <label htmlFor="type" className="block text-sm font-medium mb-2">
                  Template Type *
                </label>
                <Dropdown 
                  id="type" 
                  className="w-full" 
                  value={formData.type} 
                  onChange={(e) => onFormChange('type', e.value)} 
                  options={templateTypeOptions}
                />
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
                  rows={2}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="col-12">
              <div className="field">
                <label htmlFor="content" className="block text-sm font-medium mb-2">
                  Template Content *
                </label>
                <InputTextarea 
                  id="content" 
                  className="w-full" 
                  value={formData.content} 
                  onChange={(e) => onFormChange('content', e.target.value)} 
                  rows={15}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div className="col-12 md:col-6">
              <div className="field-checkbox">
                <Checkbox 
                  id="isActive" 
                  checked={formData.isActive} 
                  onChange={(e) => onFormChange('isActive', e.checked)} 
                />
                <label htmlFor="isActive" className="ml-2">Active</label>
              </div>
            </div>

            <div className="col-12 md:col-6">
              <div className="field-checkbox">
                <Checkbox 
                  id="isDefault" 
                  checked={formData.isDefault} 
                  onChange={(e) => onFormChange('isDefault', e.checked)} 
                />
                <label htmlFor="isDefault" className="ml-2">Set as Default</label>
              </div>
            </div>

            <div className="col-12">
              <small className="text-color-secondary">
                <strong>Available Variables:</strong> {`{firstName}, {lastName}, {employeeId}, {department}, {designation}, {email}, {phone}, {joiningDate}, {salary}, {currentDate}, {companyName}, {companyAddress}`}, etc.
              </small>
            </div>
          </div>
        </Dialog>

        {/* Template Detail Dialog */}
        <Dialog
          header="Template Details"
          visible={isDetailOpen}
          style={{ width: '800px', height: '80vh' }}
          modal
          maximizable
          onHide={closeDetail}
          footer={
            <div className="flex justify-content-end">
              <Button label="Close" className="p-button-text" onClick={closeDetail} />
            </div>
          }
        >
          {viewingTemplate && (
            <div className="grid">
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Template Name:</strong>
                  <div className="mt-1">{viewingTemplate.name}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Type:</strong>
                  <div className="mt-1">{getTypeBadge(viewingTemplate.type)}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Status:</strong>
                  <div className="mt-1">{getStatusBadge(viewingTemplate.isActive)}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <strong>Usage Count:</strong>
                  <div className="mt-1">{viewingTemplate.usageCount || 0}</div>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <strong>Description:</strong>
                  <div className="mt-1 p-3 surface-100 border-round">
                    {viewingTemplate.description || 'No description provided'}
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <strong>Template Content:</strong>
                  <div className="mt-1 p-3 surface-100 border-round" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '400px', overflow: 'auto' }}>
                    {viewingTemplate.content}
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

export default Templates;
