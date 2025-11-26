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
import { Editor } from 'primereact/editor';
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
    
    // Load default template content when type is selected
    if (name === 'type' && value && editorMode === 'create') {
      const defaultContent = getDefaultTemplateContent(value);
      if (defaultContent) {
        setFormData(prev => ({ ...prev, content: defaultContent }));
      }
    }
  };

  const getDefaultTemplateContent = (type) => {
    const templates = {
      offer_letter: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { margin: 0; color: #2c3e50; }
    .date { text-align: right; margin: 20px 0; }
    .content { margin: 20px 0; }
    .terms { margin: 20px 0; }
    .terms ul { list-style-type: none; padding: 0; }
    .terms li { padding: 5px 0; }
    .footer { margin-top: 40px; }
    .signature { margin-top: 60px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{companyName}}</h1>
    <p>{{companyAddress}}</p>
  </div>
  
  <div class="date">
    <strong>Date:</strong> {{offerDate}}
  </div>
  
  <div class="content">
    <p>Dear {{candidateName}},</p>
    
    <p>We are delighted to extend this offer of employment to you for the position of <strong>{{designation}}</strong> 
    in our {{department}} department. We were impressed with your qualifications and believe you will make a 
    valuable addition to our team.</p>
    
    <div class="terms">
      <h3>Terms and Conditions of Employment:</h3>
      <ul>
        <li><strong>Position:</strong> {{designation}}</li>
        <li><strong>Department:</strong> {{department}}</li>
        <li><strong>Reporting Manager:</strong> {{reportingManager}}</li>
        <li><strong>Start Date:</strong> {{joiningDate}}</li>
        <li><strong>Work Location:</strong> {{location}}</li>
        <li><strong>Annual CTC:</strong> {{ctc}}</li>
        <li><strong>Probation Period:</strong> {{probationPeriod}} months</li>
      </ul>
    </div>
    
    <p>This offer is contingent upon successful completion of background verification and submission of required documents.</p>
    
    <p>Please confirm your acceptance of this offer by signing and returning a copy of this letter by <strong>{{acceptanceDeadline}}</strong>.</p>
    
    <p>We look forward to welcoming you to our team!</p>
  </div>
  
  <div class="footer">
    <p>Best regards,</p>
    <div class="signature">
      <p><strong>{{hrName}}</strong><br>
      HR Manager<br>
      {{companyName}}</p>
    </div>
  </div>
</body>
</html>`,
      payslip: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; background: #2c3e50; color: white; padding: 15px; margin-bottom: 20px; }
    .header h2 { margin: 0; }
    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .info-box { padding: 10px; background: #f8f9fa; border-left: 3px solid #3498db; }
    .info-box p { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    table th { background: #34495e; color: white; padding: 10px; text-align: left; }
    table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .earnings { background: #e8f5e9; }
    .deductions { background: #ffebee; }
    .total-row { font-weight: bold; background: #e3f2fd; }
    .net-pay { background: #4caf50; color: white; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px; }
    .net-pay h3 { margin: 0; font-size: 24px; }
    .attendance { background: #fff3e0; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>{{companyName}}</h2>
    <p>Payslip for {{month}} {{year}}</p>
  </div>
  
  <div class="info-section">
    <div class="info-box">
      <p><strong>Employee Name:</strong> {{employeeName}}</p>
      <p><strong>Employee ID:</strong> {{employeeId}}</p>
      <p><strong>Department:</strong> {{department}}</p>
      <p><strong>Designation:</strong> {{designation}}</p>
    </div>
    <div class="info-box">
      <p><strong>Pay Period:</strong> {{month}} {{year}}</p>
      <p><strong>Payment Date:</strong> {{paymentDate}}</p>
      <p><strong>Bank Account:</strong> {{accountNumber}}</p>
      <p><strong>PAN:</strong> {{pan}}</p>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th colspan="2" class="earnings">Earnings</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Basic Salary</td>
        <td style="text-align: right;">{{basicSalary}}</td>
      </tr>
      <tr>
        <td>House Rent Allowance (HRA)</td>
        <td style="text-align: right;">{{hra}}</td>
      </tr>
      <tr>
        <td>Medical Allowance</td>
        <td style="text-align: right;">{{medical}}</td>
      </tr>
      <tr>
        <td>Transport Allowance</td>
        <td style="text-align: right;">{{transport}}</td>
      </tr>
      <tr>
        <td>Overtime Pay</td>
        <td style="text-align: right;">{{overtimeAmount}}</td>
      </tr>
      <tr>
        <td>Other Allowances</td>
        <td style="text-align: right;">{{otherAllowances}}</td>
      </tr>
      <tr class="total-row">
        <td>Gross Salary</td>
        <td style="text-align: right;">{{grossSalary}}</td>
      </tr>
    </tbody>
  </table>
  
  <table>
    <thead>
      <tr>
        <th colspan="2" class="deductions">Deductions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Provident Fund (PF)</td>
        <td style="text-align: right;">{{pf}}</td>
      </tr>
      <tr>
        <td>Employee State Insurance (ESI)</td>
        <td style="text-align: right;">{{esi}}</td>
      </tr>
      <tr>
        <td>Professional Tax</td>
        <td style="text-align: right;">{{professionalTax}}</td>
      </tr>
      <tr>
        <td>Income Tax (TDS)</td>
        <td style="text-align: right;">{{tax}}</td>
      </tr>
      <tr>
        <td>Other Deductions</td>
        <td style="text-align: right;">{{otherDeductions}}</td>
      </tr>
      <tr class="total-row">
        <td>Total Deductions</td>
        <td style="text-align: right;">{{totalDeductions}}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="net-pay">
    <h3>Net Salary: {{netSalary}}</h3>
    <p>In Words: {{netSalaryWords}}</p>
  </div>
  
  <div class="attendance">
    <h3 style="margin-top: 0;">Attendance Summary</h3>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
      <p><strong>Total Days:</strong> {{totalDays}}</p>
      <p><strong>Present Days:</strong> {{presentDays}}</p>
      <p><strong>Absent Days:</strong> {{absentDays}}</p>
      <p><strong>Paid Leaves:</strong> {{paidLeaveDays}}</p>
      <p><strong>Late Days:</strong> {{lateDays}}</p>
      <p><strong>Working Hours:</strong> {{workingHours}}</p>
    </div>
  </div>
  
  <p style="text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 12px;">
    This is a computer-generated document and does not require a signature.<br>
    Generated on {{generatedDate}}
  </p>
</body>
</html>`,
      appointment_letter: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header h1 { margin: 0; color: #2c3e50; }
    .content { margin: 20px 0; }
    .details { margin: 20px 0; background: #f5f5f5; padding: 15px; border-left: 4px solid #3498db; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{companyName}}</h1>
    <p>APPOINTMENT LETTER</p>
  </div>
  
  <p><strong>Date:</strong> {{appointmentDate}}</p>
  <p><strong>Employee ID:</strong> {{employeeId}}</p>
  
  <div class="content">
    <p>Dear {{employeeName}},</p>
    
    <p>Further to your acceptance of our offer, we are pleased to formally appoint you to the position of 
    <strong>{{designation}}</strong> in our {{department}} department, effective {{joiningDate}}.</p>
    
    <div class="details">
      <h3>Employment Details:</h3>
      <p><strong>Designation:</strong> {{designation}}</p>
      <p><strong>Department:</strong> {{department}}</p>
      <p><strong>Reporting To:</strong> {{reportingManager}}</p>
      <p><strong>Work Location:</strong> {{workLocation}}</p>
      <p><strong>Monthly Salary:</strong> {{monthlySalary}}</p>
      <p><strong>Probation Period:</strong> {{probationPeriod}} months (ending {{probationEndDate}})</p>
    </div>
    
    <p>Your employment is subject to company policies and procedures as outlined in the Employee Handbook.</p>
    
    <p>We wish you a successful and rewarding career with {{companyName}}.</p>
    
    <p>Congratulations and welcome aboard!</p>
  </div>
  
  <div class="signature" style="margin-top: 60px;">
    <p><strong>{{hrName}}</strong><br>
    HR Manager</p>
  </div>
</body>
</html>`
    };

    return templates[type] || '';
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
                <Editor 
                  id="content" 
                  value={formData.content} 
                  onTextChange={(e) => onFormChange('content', e.htmlValue)} 
                  style={{ height: '320px' }}
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
