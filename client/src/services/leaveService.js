import api from './api';

export const leaveService = {
  async applyLeave(data) {
    const response = await api.post('/leaves', data);
    return response.data;
  },

  async getLeaves(params = {}) {
    const response = await api.get('/leaves', { params });
    return response.data;
  },

  async getLeave(leaveId) {
    const response = await api.get(`/leaves/${leaveId}`);
    return response.data.leave;
    },

  async approveLeave(leaveId, status, rejectionReason) {
    const response = await api.put(`/leaves/${leaveId}/approve`, { status, rejectionReason });
    return response.data;
  },

  async cancelLeave(leaveId) {
    const response = await api.put(`/leaves/${leaveId}/cancel`);
    return response.data;
  },

  async addComment(leaveId, comment) {
    const response = await api.post(`/leaves/${leaveId}/comments`, { comment });
    return response.data;
  },

  async getBalance(employeeId, year) {
    const response = await api.get(`/leaves/balance/${employeeId}`, { params: { year } });
    return response.data.balance;
  },

  async getPendingApprovals() {
    const response = await api.get('/leaves/pending/approvals');
    return response.data.pendingLeaves;
  },

  async updateLeave(leaveId, data) {
    const response = await api.put(`/leaves/${leaveId}`, data);
    return response.data;
  },

  async deleteLeave(leaveId) {
    const response = await api.delete(`/leaves/${leaveId}`);
    return response.data;
  }
};


