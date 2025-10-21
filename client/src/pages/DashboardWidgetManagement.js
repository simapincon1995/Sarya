import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { useRef } from 'react';
import { dashboardService } from '../services/dashboardService';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './DashboardWidgetManagement.css';

const DashboardWidgetManagement = () => {
  const [widgets, setWidgets] = useState([]);
  const [performerOfDay, setPerformerOfDay] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPerformerDialog, setShowPerformerDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const toast = useRef(null);

  // Performer of Day form data
  const [performerForm, setPerformerForm] = useState({
    employeeName: '',
    department: '',
    achievement: '',
    reason: '',
    isVisible: true
  });

  // Widget form data
  const [widgetForm, setWidgetForm] = useState({
    name: '',
    type: 'announcement',
    title: '',
    description: '',
    data: {},
    isVisible: true,
    isPublic: false
  });

  const widgetTypes = [
    { label: 'Announcement', value: 'announcement' },
    { label: 'Metric', value: 'metric' },
    { label: 'Chart', value: 'chart' },
    { label: 'Table', value: 'table' },
    { label: 'Custom', value: 'custom' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [widgetsResponse, performerResponse] = await Promise.all([
        dashboardService.getDashboardWidgets(),
        dashboardService.getPerformerOfDay()
      ]);
      
      setWidgets(widgetsResponse.widgets);
      setPerformerOfDay(performerResponse.widget);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load dashboard data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePerformerSubmit = async () => {
    try {
      if (!performerForm.employeeName || !performerForm.department || !performerForm.achievement) {
        toast.current?.show({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please fill in all required fields'
        });
        return;
      }

      await dashboardService.updatePerformerOfDay(performerForm);
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Performer of the day updated successfully'
      });

      setShowPerformerDialog(false);
      setPerformerForm({
        employeeName: '',
        department: '',
        achievement: '',
        reason: '',
        isVisible: true
      });
      loadData();
    } catch (error) {
      console.error('Error updating performer of day:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update performer of the day'
      });
    }
  };

  const handleHidePerformer = async () => {
    try {
      await dashboardService.hidePerformerOfDay();
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Performer of the day hidden successfully'
      });

      loadData();
    } catch (error) {
      console.error('Error hiding performer of day:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to hide performer of the day'
      });
    }
  };

  const handleWidgetSubmit = async () => {
    try {
      if (!widgetForm.name || !widgetForm.title) {
        toast.current?.show({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please fill in all required fields'
        });
        return;
      }

      if (editingWidget) {
        await dashboardService.updateDashboardWidget(editingWidget._id, widgetForm);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Widget updated successfully'
        });
      } else {
        await dashboardService.createDashboardWidget(widgetForm);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Widget created successfully'
        });
      }

      setShowCreateDialog(false);
      setEditingWidget(null);
      setWidgetForm({
        name: '',
        type: 'announcement',
        title: '',
        description: '',
        data: {},
        isVisible: true,
        isPublic: false
      });
      loadData();
    } catch (error) {
      console.error('Error saving widget:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save widget'
      });
    }
  };

  const handleEditWidget = (widget) => {
    setEditingWidget(widget);
    setWidgetForm({
      name: widget.name,
      type: widget.type,
      title: widget.title,
      description: widget.description || '',
      data: widget.data || {},
      isVisible: widget.isVisible,
      isPublic: widget.isPublic
    });
    setShowCreateDialog(true);
  };

  const handleDeleteWidget = async (widgetId) => {
    try {
      await dashboardService.deleteDashboardWidget(widgetId);
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Widget deleted successfully'
      });

      loadData();
    } catch (error) {
      console.error('Error deleting widget:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete widget'
      });
    }
  };

  const getStatusSeverity = (isVisible) => {
    return isVisible ? 'success' : 'danger';
  };

  const getStatusLabel = (isVisible) => {
    return isVisible ? 'Visible' : 'Hidden';
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard widgets..." />;
  }

  return (
    <div className="dashboard-widget-management">
      <Toast ref={toast} />
      
      <div className="page-header">
        <h1>Dashboard Widget Management</h1>
        <p>Manage dashboard widgets and performer of the day</p>
      </div>

      {/* Performer of the Day Section */}
      <Card title="Performer of the Day" className="performer-section">
        <div className="performer-content">
          {performerOfDay ? (
            <div className="current-performer">
              <div className="performer-info">
                <h3>{performerOfDay.performerData.employeeName}</h3>
                <p className="department">{performerOfDay.performerData.department}</p>
                <p className="achievement">{performerOfDay.performerData.achievement}</p>
                {performerOfDay.performerData.reason && (
                  <p className="reason">{performerOfDay.performerData.reason}</p>
                )}
                <p className="updated-info">
                  Updated by: {performerOfDay.performerData.updatedBy} on {new Date(performerOfDay.performerData.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="performer-actions">
                <Button
                  label="Update"
                  icon="pi pi-pencil"
                  className="p-button-outlined"
                  onClick={() => setShowPerformerDialog(true)}
                />
                <Button
                  label="Hide"
                  icon="pi pi-eye-slash"
                  className="p-button-outlined p-button-danger"
                  onClick={handleHidePerformer}
                />
              </div>
            </div>
          ) : (
            <div className="no-performer">
              <p>No performer of the day set</p>
              <Button
                label="Set Performer of the Day"
                icon="pi pi-plus"
                onClick={() => setShowPerformerDialog(true)}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Widgets Management Section */}
      <Card title="Dashboard Widgets" className="widgets-section">
        <div className="widgets-header">
          <Button
            label="Create Widget"
            icon="pi pi-plus"
            onClick={() => {
              setEditingWidget(null);
              setShowCreateDialog(true);
            }}
          />
        </div>

        <DataTable
          value={widgets}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          className="widgets-table"
        >
          <Column field="name" header="Name" sortable />
          <Column field="type" header="Type" sortable />
          <Column field="title" header="Title" sortable />
          <Column 
            field="isVisible" 
            header="Status" 
            body={(rowData) => (
              <Tag 
                value={getStatusLabel(rowData.isVisible)} 
                severity={getStatusSeverity(rowData.isVisible)} 
              />
            )}
          />
          <Column 
            field="isPublic" 
            header="Public" 
            body={(rowData) => (
              <Tag 
                value={rowData.isPublic ? 'Yes' : 'No'} 
                severity={rowData.isPublic ? 'success' : 'info'} 
              />
            )}
          />
          <Column 
            field="createdBy.firstName" 
            header="Created By" 
            body={(rowData) => `${rowData.createdBy?.firstName} ${rowData.createdBy?.lastName}`}
          />
          <Column 
            header="Actions" 
            body={(rowData) => (
              <div className="action-buttons">
                <Button
                  icon="pi pi-pencil"
                  className="p-button-text p-button-sm"
                  onClick={() => handleEditWidget(rowData)}
                  tooltip="Edit"
                />
                <Button
                  icon="pi pi-trash"
                  className="p-button-text p-button-sm p-button-danger"
                  onClick={() => handleDeleteWidget(rowData._id)}
                  tooltip="Delete"
                />
              </div>
            )}
          />
        </DataTable>
      </Card>

      {/* Performer of Day Dialog */}
      <Dialog
        header="Set Performer of the Day"
        visible={showPerformerDialog}
        style={{ width: '50vw' }}
        onHide={() => setShowPerformerDialog(false)}
      >
        <div className="performer-form">
          <div className="form-group">
            <label htmlFor="employeeName">Employee Name *</label>
            <InputText
              id="employeeName"
              value={performerForm.employeeName}
              onChange={(e) => setPerformerForm({ ...performerForm, employeeName: e.target.value })}
              placeholder="Enter employee name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="department">Department *</label>
            <InputText
              id="department"
              value={performerForm.department}
              onChange={(e) => setPerformerForm({ ...performerForm, department: e.target.value })}
              placeholder="Enter department"
            />
          </div>

          <div className="form-group">
            <label htmlFor="achievement">Achievement *</label>
            <InputText
              id="achievement"
              value={performerForm.achievement}
              onChange={(e) => setPerformerForm({ ...performerForm, achievement: e.target.value })}
              placeholder="Enter achievement"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reason">Reason (Optional)</label>
            <InputTextarea
              id="reason"
              value={performerForm.reason}
              onChange={(e) => setPerformerForm({ ...performerForm, reason: e.target.value })}
              placeholder="Enter reason for selection"
              rows={3}
            />
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <Checkbox
                inputId="isVisible"
                checked={performerForm.isVisible}
                onChange={(e) => setPerformerForm({ ...performerForm, isVisible: e.checked })}
              />
              <label htmlFor="isVisible">Make visible on live dashboard</label>
            </div>
          </div>

          <div className="dialog-actions">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setShowPerformerDialog(false)}
            />
            <Button
              label="Save"
              icon="pi pi-check"
              onClick={handlePerformerSubmit}
            />
          </div>
        </div>
      </Dialog>

      {/* Create/Edit Widget Dialog */}
      <Dialog
        header={editingWidget ? "Edit Widget" : "Create Widget"}
        visible={showCreateDialog}
        style={{ width: '60vw' }}
        onHide={() => setShowCreateDialog(false)}
      >
        <div className="widget-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="widgetName">Name *</label>
              <InputText
                id="widgetName"
                value={widgetForm.name}
                onChange={(e) => setWidgetForm({ ...widgetForm, name: e.target.value })}
                placeholder="Enter widget name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="widgetType">Type *</label>
              <Dropdown
                id="widgetType"
                value={widgetForm.type}
                options={widgetTypes}
                onChange={(e) => setWidgetForm({ ...widgetForm, type: e.value })}
                placeholder="Select widget type"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="widgetTitle">Title *</label>
            <InputText
              id="widgetTitle"
              value={widgetForm.title}
              onChange={(e) => setWidgetForm({ ...widgetForm, title: e.target.value })}
              placeholder="Enter widget title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="widgetDescription">Description</label>
            <InputTextarea
              id="widgetDescription"
              value={widgetForm.description}
              onChange={(e) => setWidgetForm({ ...widgetForm, description: e.target.value })}
              placeholder="Enter widget description"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="checkbox-group">
              <Checkbox
                inputId="isVisible"
                checked={widgetForm.isVisible}
                onChange={(e) => setWidgetForm({ ...widgetForm, isVisible: e.checked })}
              />
              <label htmlFor="isVisible">Visible</label>
            </div>

            <div className="checkbox-group">
              <Checkbox
                inputId="isPublic"
                checked={widgetForm.isPublic}
                onChange={(e) => setWidgetForm({ ...widgetForm, isPublic: e.checked })}
              />
              <label htmlFor="isPublic">Public (Show on live dashboard)</label>
            </div>
          </div>

          <div className="dialog-actions">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setShowCreateDialog(false)}
            />
            <Button
              label={editingWidget ? "Update" : "Create"}
              icon="pi pi-check"
              onClick={handleWidgetSubmit}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default DashboardWidgetManagement;
