import api from './api';

export const employeeService = {
  // Get all employees
  async getEmployees(params = {}) {
    try {
      const response = await api.get('/employees', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee by ID
  async getEmployee(employeeId) {
    try {
      const response = await api.get(`/employees/${employeeId}`);
      return response.data.employee;
    } catch (error) {
      throw error;
    }
  },

  // Create new employee
  async createEmployee(employeeData) {
    try {
      const response = await api.post('/employees', employeeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update employee
  async updateEmployee(employeeId, employeeData) {
    try {
      const response = await api.put(`/employees/${employeeId}`, employeeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete employee
  async deleteEmployee(employeeId) {
    try {
      const response = await api.delete(`/employees/${employeeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get team members
  async getTeamMembers(employeeId) {
    try {
      const response = await api.get(`/employees/${employeeId}/team`);
      return response.data.teamMembers;
    } catch (error) {
      throw error;
    }
  },

  // Get departments
  async getDepartments() {
    try {
      const response = await api.get('/employees/meta/departments');
      return response.data.departments;
    } catch (error) {
      throw error;
    }
  },

  // Get managers
  async getManagers() {
    try {
      const response = await api.get('/employees/meta/managers');
      return response.data.managers;
    } catch (error) {
      throw error;
    }
  },

  // Generate offer letter
  async generateOfferLetter(offerData) {
    try {
      const response = await api.post('/employees/generate-offer', offerData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate appointment letter
  async generateAppointmentLetter(employeeId) {
    try {
      const response = await api.post(`/employees/${employeeId}/generate-appointment`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate experience certificate
  async generateExperienceCertificate(employeeId, lastWorkingDate) {
    try {
      const response = await api.post(`/employees/${employeeId}/generate-experience`, {
        lastWorkingDate
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate relieving letter
  async generateRelievingLetter(employeeId, lastWorkingDate) {
    try {
      const response = await api.post(`/employees/${employeeId}/generate-relieving`, {
        lastWorkingDate
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
