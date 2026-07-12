import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const message = error.response?.data?.error || 'Something went wrong';
    toast.error(message);
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Department APIs
export const departmentAPI = {
  getAll: () => api.get('/departments'),
  getOne: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// Category APIs
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getOne: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Employee APIs
export const employeeAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  promote: (id, data) => api.put(`/users/${id}/promote`, data),
  updateStatus: (id, data) => api.put(`/users/${id}/status`, data),
};

// Asset APIs
export const assetAPI = {
  getAll: (params) => api.get('/assets', { params }),
  getOne: (id) => api.get(`/assets/${id}`),
  getByTag: (tag) => api.get(`/assets/tag/${tag}`),
  getHistory: (id) => api.get(`/assets/history/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  updateStatus: (id, data) => api.put(`/assets/${id}/status`, data),
  delete: (id) => api.delete(`/assets/${id}`),
};

// Allocation APIs
export const allocationAPI = {
  getAll: (params) => api.get('/allocations', { params }),
  getOverdue: () => api.get('/allocations/overdue'),
  getByAsset: (assetId) => api.get(`/allocations/asset/${assetId}`),
  getByEmployee: (employeeId) => api.get(`/allocations/employee/${employeeId}`),
  allocate: (data) => api.post('/allocations/allocate', data),
  requestTransfer: (data) => api.post('/allocations/transfer', data),
  approveTransfer: (id, data) => api.put(`/allocations/transfer/${id}`, data),
  returnAsset: (assetId, data) => api.put(`/allocations/return/${assetId}`, data),
};

// Booking APIs
export const bookingAPI = {
  getAll: (params) => api.get('/bookings', { params }),
  getOne: (id) => api.get(`/bookings/${id}`),
  getMyBookings: () => api.get('/bookings/my-bookings'),
  getAvailableSlots: (resourceId, date) => 
    api.get(`/bookings/available-slots/${resourceId}`, { params: { date } }),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  complete: (id) => api.put(`/bookings/${id}/complete`),
};

// Maintenance APIs
export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenances', { params }),
  getOne: (id) => api.get(`/maintenances/${id}`),
  getStats: () => api.get('/maintenances/stats'),
  getByAsset: (assetId) => api.get(`/maintenances/asset/${assetId}`),
  raise: (data) => api.post('/maintenances', data),
  approve: (id, data) => api.put(`/maintenances/${id}/approve`, data),
  reject: (id, data) => api.put(`/maintenances/${id}/reject`, data),
  start: (id, data) => api.put(`/maintenances/${id}/start`, data),
  resolve: (id, data) => api.put(`/maintenances/${id}/resolve`, data),
};

// Audit APIs
export const auditAPI = {
  getAll: (params) => api.get('/audits', { params }),
  getOne: (id) => api.get(`/audits/${id}`),
  getStats: () => api.get('/audits/stats'),
  getReport: (id) => api.get(`/audits/${id}/report`),
  create: (data) => api.post('/audits', data),
  update: (id, data) => api.put(`/audits/${id}`, data),
  verify: (id, data) => api.put(`/audits/verify/${id}`, data),
  close: (id) => api.put(`/audits/${id}/close`),
};

export default api;
