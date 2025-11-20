import api from './api';

export const attendanceService = {
  // Check in
  async checkIn(location, ipAddress, deviceInfo) {
    try {
      const response = await api.post('/attendance/checkin', {
        location,
        ipAddress,
        deviceInfo
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        console.error('Bad request details:', error.response.data);
      }
      throw error;
    }
  },

  // Check out
  async checkOut(location, ipAddress, deviceInfo) {
    try {
      const response = await api.post('/attendance/checkout', {
        location,
        ipAddress,
        deviceInfo
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Start break
  async startBreak(breakType = 'other', reason) {
    try {
      const response = await api.post('/attendance/break/start', {
        breakType,
        reason
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // End break
  async endBreak() {
    try {
      const response = await api.post('/attendance/break/end');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get attendance records
  async getAttendance(params = {}) {
    try {
      const response = await api.get('/attendance', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get attendance history
  async getAttendanceHistory(params = {}) {
    try {
      const response = await api.get('/attendance/history', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create attendance record (for absent employees)
  async createAttendance(data) {
    try {
      const response = await api.post('/attendance/create', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update attendance
  async updateAttendance(attendanceId, data) {
    try {
      const response = await api.put(`/attendance/${attendanceId}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete attendance
  async deleteAttendance(attendanceId) {
    try {
      const response = await api.delete(`/attendance/${attendanceId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get today's attendance status
  async getTodayAttendance() {
    try {
      const response = await api.get('/attendance/today');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get attendance summary
  async getAttendanceSummary(employeeId, startDate, endDate) {
    try {
      const response = await api.get(`/attendance/summary/${employeeId}`, {
        params: { startDate, endDate }
      });
      return response.data.summary;
    } catch (error) {
      throw error;
    }
  },

  // Get dashboard overview
  async getDashboardOverview() {
    try {
      const response = await api.get('/attendance/dashboard/overview');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get public dashboard overview (no auth required)
  async getPublicDashboardOverview() {
    try {
      const response = await api.get('/attendance/dashboard/public');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add activity note
  async addActivityNote(activityData) {
    try {
      const response = await api.post('/attendance/activity-note', activityData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update activity note
  async updateActivityNote(noteId, activityData) {
    try {
      const response = await api.put(`/attendance/activity-note/${noteId}`, activityData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Hide absent record (Admin/HR Admin only)
  async hideAbsentRecord(employeeId, date, reason) {
    try {
      const response = await api.post('/attendance/hide-absent', {
        employeeId,
        date,
        reason
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Unhide absent record (Admin/HR Admin only)
  async unhideAbsentRecord(employeeId, date) {
    try {
      const response = await api.delete(`/attendance/hide-absent/${employeeId}/${date}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
