import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { useAuth } from "../contexts/AuthContext";
import { attendanceService } from "../services/attendanceService";
import { employeeService } from "../services/employeeService";
import LoadingSpinner from "../components/Common/LoadingSpinner";
import * as XLSX from "xlsx";
import "./AttendanceHistory.css";

const AttendanceHistory = () => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    checkInTime: null,
    checkOutTime: null,
    status: "present",
  });
  const [totalRecords, setTotalRecords] = useState(0);
  const { user, hasPermission } = useAuth();
  const toast = useRef(null);

  const loadEmployees = async () => {
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const loadAttendanceHistory = useCallback(async () => {
    try {
      setIsHistoryLoading(true);
      const params = {
        startDate: selectedDateRange[0],
        endDate: selectedDateRange[1],
        // No pagination - load all records
      };

      // Add employeeId based on user role and selection
      if (user.role === "employee") {
        // Employee can only see their own attendance
        params.employeeId = user.id;
      } else if (selectedEmployee) {
        // HR admin/manager can select specific employee
        params.employeeId = selectedEmployee;
      }
      // If no employee selected and user is HR admin, show all employees

      const data = await attendanceService.getAttendanceHistory(params);
      setAttendanceHistory(data.attendances || []);
      setTotalRecords(data.total || data.attendances?.length || 0);
    } catch (error) {
      console.error("Error loading attendance history:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to load attendance history",
      });
    } finally {
      setIsHistoryLoading(false);
    }
  }, [selectedDateRange, user.id, user.role, selectedEmployee]);

  useEffect(() => {
    loadAttendanceHistory();
  }, [loadAttendanceHistory]);

  useEffect(() => {
    if (user.role !== "employee") {
      loadEmployees();
    }
  }, [user.role]);

  const handleDeleteRecord = async (recordId) => {
    if (!recordId) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Invalid record ID",
      });
      return;
    }
    try {
      await attendanceService.deleteAttendance(recordId);
      toast.current?.show({
        severity: "success",
        summary: "Success",
        detail: "Attendance record deleted successfully",
      });
      await loadAttendanceHistory();
    } catch (error) {
      console.error("Error deleting record:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: error.response?.data?.message || "Failed to delete attendance record",
      });
    }
  };

  const confirmDelete = (recordId) => {
    if (!recordId) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Invalid record ID",
      });
      return;
    }
    confirmDialog({
      message: "Are you sure you want to delete this attendance record?",
      header: "Confirm Delete",
      icon: "pi pi-exclamation-triangle",
      accept: () => handleDeleteRecord(recordId),
    });
  };

  const openEditDialog = (record) => {
    if (!record) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Invalid record data",
      });
      return;
    }
    setEditingRecord(record);
    setEditFormData({
      checkInTime: record.checkIn?.time ? new Date(record.checkIn.time) : null,
      checkOutTime: record.checkOut?.time ? new Date(record.checkOut.time) : null,
      status: record.status || (record.isAbsent ? "absent" : "present"),
    });
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingRecord(null);
    setEditFormData({
      checkInTime: null,
      checkOutTime: null,
      status: "present",
    });
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Invalid record data",
      });
      return;
    }

    // For absent records (no _id), we need to create a new attendance record
    // For existing records, we update them
    if (!editingRecord._id) {
      // This is an absent record - we'll need to create it via check-in or manual creation
      // For now, we'll require check-in time and create the record
      if (!editFormData.checkInTime) {
        toast.current?.show({
          severity: "warn",
          summary: "Validation Error",
          detail: "Check-in time is required to create attendance record",
        });
        return;
      }

      try {
        setIsSubmitting(true);
        // Create new attendance record for absent employee
        const createData = {
          employeeId: editingRecord.employee?._id || editingRecord.employee,
          date: editingRecord.date,
          checkIn: {
            time: editFormData.checkInTime,
          },
          checkOut: editFormData.checkOutTime
            ? {
                time: editFormData.checkOutTime,
              }
            : undefined,
          status: editFormData.status,
        };

        await attendanceService.createAttendance(createData);
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail: "Attendance record created successfully",
        });
        closeEditDialog();
        await loadAttendanceHistory();
      } catch (error) {
        console.error("Error creating record:", error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: error.response?.data?.message || "Failed to create attendance record",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Existing record - update it
    if (!editFormData.checkInTime) {
      toast.current?.show({
        severity: "warn",
        summary: "Validation Error",
        detail: "Check-in time is required",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const updateData = {
        checkIn: {
          time: editFormData.checkInTime,
        },
        checkOut: editFormData.checkOutTime
          ? {
              time: editFormData.checkOutTime,
            }
          : undefined,
        status: editFormData.status,
      };

      await attendanceService.updateAttendance(editingRecord._id, updateData);
      toast.current?.show({
        severity: "success",
        summary: "Success",
        detail: "Attendance record updated successfully",
      });
      closeEditDialog();
      await loadAttendanceHistory();
    } catch (error) {
      console.error("Error updating record:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: error.response?.data?.message || "Failed to update attendance record",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatWorkingHours = (minutes) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const exportToExcel = () => {
    if (attendanceHistory.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "No Data",
        detail: "No attendance records to export",
      });
      return;
    }

    // Prepare data for export
    const exportData = attendanceHistory.map((record) => {
      const row = {
        Date: formatDate(record.date),
        "Check In": record.checkIn?.time ? formatTime(record.checkIn.time) : "-",
        "Check Out": record.checkOut?.time ? formatTime(record.checkOut.time) : "-",
        "Work Hours": formatWorkingHours(record.totalWorkingHours),
        Status: record.status || (record.isAbsent ? "absent" : "-"),
        "Break Hours": formatWorkingHours(record.totalBreakTime),
      };

      // Add employee info if user is not an employee
      if (user.role !== "employee") {
        row["Employee Name"] = record.employee
          ? `${record.employee.firstName} ${record.employee.lastName}`
          : "-";
        row["Employee ID"] = record.employee?.employeeId || "-";
      }

      return row;
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance History");

    // Generate filename with date range
    let filename = "Attendance_History";
    if (selectedDateRange && selectedDateRange.length === 2) {
      const startDate = formatDate(selectedDateRange[0]).replace(/\s/g, "_");
      const endDate = formatDate(selectedDateRange[1]).replace(/\s/g, "_");
      filename = `Attendance_History_${startDate}_to_${endDate}`;
    }

    // Write file
    XLSX.writeFile(wb, `${filename}.xlsx`);

    toast.current?.show({
      severity: "success",
      summary: "Export Successful",
      detail: "Attendance data exported to Excel",
    });
  };

  const statusBodyTemplate = (rowData) => {
    let severity = "secondary";
    let value = rowData.status || "Unknown";

    switch (rowData.status) {
      case "present":
        severity = "success";
        break;
      case "absent":
        severity = "danger";
        break;
      case "late":
        severity = "warning";
        break;
      case "partial":
        severity = "info";
        break;
      default:
        break;
    }

    return <Tag value={value} severity={severity} />;
  };

  const actionBodyTemplate = (rowData) => {
    const recordId = rowData._id || rowData.id;
    const isAbsent = rowData.isAbsent || !recordId;
    return (
      <div className="flex gap-2">
        {hasPermission("manage_attendance") && (
          <Button
            icon="pi pi-pencil"
            className="p-button-rounded p-button-text p-button-info"
            onClick={() => openEditDialog(rowData)}
            tooltip={isAbsent ? "Create Attendance Record" : "Edit Record"}
          />
        )}
        {hasPermission("manage_attendance") && !isAbsent && (
          <Button
            icon="pi pi-trash"
            className="p-button-rounded p-button-text p-button-danger"
            onClick={() => confirmDelete(recordId)}
            tooltip="Delete Record"
          />
        )}
      </div>
    );
  };

  const employeeOptions = employees.map((emp) => ({
    label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`,
    value: emp._id,
  }));

  const header = (
    <div className="history-header">
      <h2 className="history-title">Attendance History</h2>
      <div className="history-controls">
        <div className="search-container">
          <i className="pi pi-search search-icon" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search records..."
            className="search-input"
          />
        </div>
        {user.role !== "employee" && (
          <Dropdown
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.value)}
            options={employeeOptions}
            placeholder="Select Employee"
            className="employee-selector"
            showClear
          />
        )}
        <Calendar
          value={selectedDateRange}
          onChange={(e) => setSelectedDateRange(e.value)}
          selectionMode="range"
          readOnlyInput
          placeholder="Select date range"
          className="date-range-picker"
          showIcon
        />        
        <Button
          icon="pi pi-file-excel"
          className="p-button-success p-button-outlined"
          onClick={exportToExcel}
          tooltip="Export to Excel"
          label="Export Excel"
        />
        <Button
          icon="pi pi-refresh"
          className="p-button-outlined refresh-btn"
          onClick={loadAttendanceHistory}
          tooltip="Refresh Data"
        />
      </div>
    </div>
  );

  if (isHistoryLoading) {
    return <LoadingSpinner message="Loading attendance history..." />;
  }

  return (
    <div className="attendance-history-page">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="history-container">
        <Card className="history-card">
          <DataTable
            value={attendanceHistory}
            loading={isHistoryLoading}
            header={header}
            globalFilter={globalFilter}
            paginator={totalRecords > 10}
            rows={totalRecords > 0 ? totalRecords : 10}
            rowsPerPageOptions={totalRecords > 0 ? [10, 25, 50, 100, totalRecords].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b) : [10, 25, 50, 100]}
            responsiveLayout="scroll"
            emptyMessage="No attendance records found"
            className="history-table"
            rowKey={(row) => row._id || `${row.employee?._id || row.employee}_${row.date}`}
          >
            <Column
              field="date"
              header="Date"
              body={(rowData) => formatDate(rowData.date)}
              sortable
              style={{ minWidth: "120px" }}
            />
            {user.role !== "employee" && (
              <Column
                field="employee.firstName"
                header="Employee"
                body={(rowData) => (
                  <div>
                    <div className="font-medium">
                      {rowData.employee?.firstName} {rowData.employee?.lastName}
                    </div>
                    <div className="text-sm text-color-secondary">
                      {rowData.employee?.employeeId}
                    </div>
                  </div>
                )}
                sortable
                style={{ minWidth: "150px" }}
              />
            )}
            <Column
              field="checkIn.time"
              header="Check In"
              body={(rowData) => formatTime(rowData.checkIn?.time)}
              sortable
              style={{ minWidth: "100px" }}
            />
            <Column
              field="checkOut.time"
              header="Check Out"
              body={(rowData) => formatTime(rowData.checkOut?.time)}
              sortable
              style={{ minWidth: "100px" }}
            />
            <Column
              field="totalWorkingHours"
              header="Work Hours"
              body={(rowData) => {
                if (!rowData.totalWorkingHours) return "-";
                const hours = Math.floor(rowData.totalWorkingHours / 60);
                const minutes = Math.round(rowData.totalWorkingHours % 60);
                return `${hours}h ${minutes}m`;
              }}
              sortable
              style={{ minWidth: "120px" }}
            />
            <Column
              field="status"
              header="Status"
              body={statusBodyTemplate}
              sortable
              style={{ minWidth: "100px" }}
            />
            <Column
              field="totalBreakTime"
              header="Break Hours"
              body={(rowData) => {
                if (!rowData.totalBreakTime) return "-";

                const hours = Math.floor(rowData.totalBreakTime / 60);
                const minutes = Math.round(rowData.totalBreakTime % 60);

                return `${hours}h ${minutes}m`;
              }}
              sortable
              style={{ minWidth: "120px" }}
            />
            <Column
              header="Actions"
              body={actionBodyTemplate}
              style={{ minWidth: "120px" }}
              exportable={false}
            />
          </DataTable>
        </Card>
      </div>

      {/* Edit Attendance Dialog */}
      <Dialog
        header={editingRecord?.isAbsent ? "Create Attendance Record" : "Edit Attendance Record"}
        visible={isEditDialogOpen}
        style={{ width: "600px" }}
        modal
        onHide={closeEditDialog}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button
              label="Cancel"
              className="p-button-text"
              onClick={closeEditDialog}
              disabled={isSubmitting}
            />
            <Button
              label={editingRecord?.isAbsent ? "Create" : "Update"}
              icon="pi pi-check"
              loading={isSubmitting}
              onClick={handleEditSubmit}
              disabled={isSubmitting}
            />
          </div>
        }
      >
        <div className="grid">
          <div className="col-12">
            <div className="field">
              <label htmlFor="checkInTime" className="block text-sm font-medium mb-2">
                Check In Time <span className="text-red-500">*</span>
              </label>
              <Calendar
                id="checkInTime"
                value={editFormData.checkInTime}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, checkInTime: e.value })
                }
                showTime
                hourFormat="12"
                className="w-full"
                showIcon
              />
            </div>
          </div>
          <div className="col-12">
            <div className="field">
              <label htmlFor="checkOutTime" className="block text-sm font-medium mb-2">
                Check Out Time
              </label>
              <Calendar
                id="checkOutTime"
                value={editFormData.checkOutTime}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, checkOutTime: e.value })
                }
                showTime
                hourFormat="12"
                className="w-full"
                showIcon
              />
            </div>
          </div>
          <div className="col-12">
            <div className="field">
              <label htmlFor="status" className="block text-sm font-medium mb-2">
                Status
              </label>
              <Dropdown
                id="status"
                value={editFormData.status}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, status: e.value })
                }
                options={[
                  { label: "Present", value: "present" },
                  { label: "Absent", value: "absent" },
                  { label: "Late", value: "late" },
                  { label: "Half Day", value: "half-day" },
                  { label: "On Leave", value: "on-leave" },
                ]}
                className="w-full"
                placeholder="Select Status"
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default AttendanceHistory;
