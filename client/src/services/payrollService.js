import api from './api';

export const payrollService = {
  async createPayroll(data) {
    const response = await api.post('/payroll', data);
    return response.data;
  },

  async getPayrolls(params = {}) {
    const response = await api.get('/payroll', { params });
    return response.data;
  },

  async generate(month, year) {
    const response = await api.post('/payroll/generate', { month, year });
    return response.data;
  },

  async getPayroll(payrollId) {
    const response = await api.get(`/payroll/${payrollId}`);
    return response.data.payroll;
  },

  async updatePayroll(payrollId, data) {
    const response = await api.put(`/payroll/${payrollId}`, data);
    return response.data;
  },

  async deletePayroll(payrollId) {
    const response = await api.delete(`/payroll/${payrollId}`);
    return response.data;
  },

  async approvePayroll(payrollId) {
    const response = await api.put(`/payroll/${payrollId}/approve`);
    return response.data;
  },

  async markAsPaid(payrollId, paymentMethod, bankDetails) {
    const response = await api.put(`/payroll/${payrollId}/pay`, { paymentMethod, bankDetails });
    return response.data;
  },

  async getPayslip(payrollId) {
    const response = await api.get(`/payroll/${payrollId}/payslip`);
    return response.data.payslip;
  },

  async getSummary(year, month) {
    const response = await api.get(`/payroll/summary/${year}/${month}`);
    return response.data.summary;
  }
};


