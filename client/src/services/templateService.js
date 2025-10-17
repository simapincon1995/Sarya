import api from './api';

export const templateService = {
  async getTemplates(params = {}) {
    const response = await api.get('/templates', { params });
    return response.data;
  },

  async getTemplate(templateId) {
    const response = await api.get(`/templates/${templateId}`);
    return response.data.template;
  },

  async createTemplate(data) {
    const response = await api.post('/templates', data);
    return response.data;
  },

  async updateTemplate(templateId, data) {
    const response = await api.put(`/templates/${templateId}`, data);
    return response.data;
  },

  async deleteTemplate(templateId) {
    const response = await api.delete(`/templates/${templateId}`);
    return response.data;
  },

  async duplicateTemplate(templateId, name) {
    const response = await api.post(`/templates/${templateId}/duplicate`, { name });
    return response.data;
  },

  async renderTemplate(templateId, data) {
    const response = await api.post(`/templates/${templateId}/render`, { data });
    return response.data;
  },

  async getByType(type, isActive = true) {
    const response = await api.get(`/templates/type/${type}`, { params: { isActive } });
    return response.data.templates;
  },

  async getUsage(templateId) {
    const response = await api.get(`/templates/${templateId}/usage`);
    return response.data;
  }
};


