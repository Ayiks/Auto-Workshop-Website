import api from './client';

export const messagingApi = {
  bulkSend: async (data) => {
    return api.post('/messaging/bulk', data);
  },

  singleSend: async (data) => {
    return api.post('/messaging/single', data);
  },

  getLogs: async ({ limit = 20, offset = 0 } = {}) => {
    return api.get('/messaging/logs', { params: { limit, offset } });
  },

  getRecipients: async (logId) => {
    return api.get(`/messaging/logs/${logId}/recipients`);
  },
};
