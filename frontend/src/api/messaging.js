import api from './client';

export const messagingApi = {
  bulkSend: async (data) => {
    const response = await api.post('/messaging/bulk', data);
    return response.data;
  },

  singleSend: async (data) => {
    const response = await api.post('/messaging/single', data);
    return response.data;
  },
};
