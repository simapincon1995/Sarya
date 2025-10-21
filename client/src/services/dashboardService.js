import api from './api';

export const dashboardService = {
  // Get all dashboard widgets (for management)
  async getDashboardWidgets() {
    try {
      const response = await api.get('/dashboard');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get public dashboard widgets (for live dashboard)
  async getPublicDashboardWidgets() {
    try {
      const response = await api.get('/dashboard/public');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new dashboard widget
  async createDashboardWidget(widgetData) {
    try {
      const response = await api.post('/dashboard', widgetData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update dashboard widget
  async updateDashboardWidget(widgetId, updateData) {
    try {
      const response = await api.put(`/dashboard/${widgetId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete dashboard widget
  async deleteDashboardWidget(widgetId) {
    try {
      const response = await api.delete(`/dashboard/${widgetId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create or update "Performer of the Day"
  async updatePerformerOfDay(performerData) {
    try {
      const response = await api.post('/dashboard/performer-of-day', performerData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get "Performer of the Day"
  async getPerformerOfDay() {
    try {
      const response = await api.get('/dashboard/performer-of-day');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Hide "Performer of the Day"
  async hidePerformerOfDay() {
    try {
      const response = await api.put('/dashboard/performer-of-day/hide');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
