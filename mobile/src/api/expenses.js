import api from './client';

export const expensesApi = {
  getExpenses:     (params)    => api.get('/expenses', { params }),
  getExpense:      (id)        => api.get(`/expenses/${id}`),
  createExpense:   (data)      => api.post('/expenses', data),
  updateExpense:   (id, data)  => api.put(`/expenses/${id}`, data),
  deleteExpense:   (id)        => api.delete(`/expenses/${id}`),
  getStats:        (params)    => api.get('/expenses/stats', { params }),
};
