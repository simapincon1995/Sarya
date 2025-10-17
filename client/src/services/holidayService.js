import api from './api';

export const holidayService = {
  async getHolidays(params = {}) {
    const response = await api.get('/holidays', { params });
    return response.data;
  },

  async getHoliday(holidayId) {
    const response = await api.get(`/holidays/${holidayId}`);
    return response.data.holiday;
  },

  async createHoliday(holidayData) {
    const response = await api.post('/holidays', holidayData);
    return response.data;
  },

  async updateHoliday(holidayId, holidayData) {
    const response = await api.put(`/holidays/${holidayId}`, holidayData);
    return response.data;
  },

  async deleteHoliday(holidayId) {
    const response = await api.delete(`/holidays/${holidayId}`);
    return response.data;
  },

  async getUpcoming(limit = 10) {
    const response = await api.get(`/holidays/upcoming/${limit}`);
    return response.data.holidays;
  },

  async getRange(startDate, endDate, departments = [], locations = []) {
    const params = {};
    if (departments.length) params.departments = departments.join(',');
    if (locations.length) params.locations = locations.join(',');
    const response = await api.get(`/holidays/range/${startDate}/${endDate}`, { params });
    return response.data.holidays;
  },

  async getCalendar(year, department, location) {
    const params = {};
    if (department) params.department = department;
    if (location) params.location = location;
    const response = await api.get(`/holidays/calendar/${year}`, { params });
    return response.data;
  },

  async checkDate(date, department, location) {
    const params = {};
    if (department) params.department = department;
    if (location) params.location = location;
    const response = await api.get(`/holidays/check/${date}`, { params });
    return response.data;
  }
};


