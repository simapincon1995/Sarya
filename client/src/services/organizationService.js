import api from './api';

export const organizationService = {
  // Get organization settings
  async getSettings() {
    try {
      const response = await api.get('/organization/settings');
      return response.data.settings;
    } catch (error) {
      throw error;
    }
  },

  // Update organization settings
  async updateSettings(settings) {
    try {
      const response = await api.put('/organization/settings', { settings });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get organization information
  async getOrganization() {
    try {
      const response = await api.get('/organization');
      return response.data.organization;
    } catch (error) {
      throw error;
    }
  },

  // Create organization
  async createOrganization(organizationData) {
    try {
      const response = await api.post('/organization', organizationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update organization
  async updateOrganization(organizationId, organizationData) {
    try {
      const response = await api.put(`/organization/${organizationId}`, organizationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
