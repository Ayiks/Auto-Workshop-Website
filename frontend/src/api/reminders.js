import api from './client';

export const remindersApi = {
  getReminders: async (params) => {
    const response = await api.get('/reminders', { params });
    return response.data;
  },

  createReminder: async (data) => {
    const response = await api.post('/reminders', data);
    return response.data;
  },

  updateReminder: async (id, data) => {
    const response = await api.put(`/reminders/${id}`, data);
    return response.data;
  },

  updateReminderStatus: async (id, status) => {
    const response = await api.put(`/reminders/${id}/status`, { status });
    return response.data;
  },

  deleteReminder: async (id) => {
    const response = await api.delete(`/reminders/${id}`);
    return response.data;
  },
};
