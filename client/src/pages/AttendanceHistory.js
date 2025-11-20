import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { useAuth } from "../contexts/AuthContext";
import { attendanceService } from "../services/attendanceService";
import { employeeService } from "../services/employeeService";
import LoadingSpinner from "../components/Common/LoadingSpinner";
import "./AttendanceHistory.css";

const AttendanceHistory = () => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
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
        detail: "Failed to delete attendance record",
      });
    }
  };

  const confirmDelete = (recordId) => {
    confirmDialog({
      message: "Are you sure you want to delete this attendance record?",
      header: "Confirm Delete",
      icon: "pi pi-exclamation-triangle",
      accept: () => handleDeleteRecord(recordId),
    });
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
    return (
      <div className="flex gap-2">
        {hasPermission("manage_attendance") && (
          <Button
            icon="pi pi-pencil"
            className="p-button-rounded p-button-text p-button-info"
            onClick={() => console.log("Edit:", rowData.id)}
            tooltip="Edit Record"
          />
        )}
        {hasPermission("manage_attendance") && (
          <Button
            icon="pi pi-trash"
            className="p-button-rounded p-button-text p-button-danger"
            onClick={() => confirmDelete(rowData.id)}
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
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            responsiveLayout="scroll"
            emptyMessage="No attendance records found"
            className="history-table"
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
    </div>
  );
};

export default AttendanceHistory;
