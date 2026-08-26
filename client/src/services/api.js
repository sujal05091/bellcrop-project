import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if we're not already on login/register
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// Rooms
export const roomsAPI = {
  list: (params) => api.get('/rooms', { params }),
  get: (id) => api.get(`/rooms/${id}`),
  checkAvailability: (id, checkIn, checkOut) =>
    api.get(`/rooms/${id}/availability`, { params: { checkIn, checkOut } }),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.patch(`/rooms/${id}`, data),
};

// Bookings
export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  getMyBookings: (params) => api.get('/bookings/me', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAllRooms: (params) => api.get('/admin/rooms', { params }),
  getAllBookings: (params) => api.get('/admin/bookings', { params }),
  deleteBooking: (id) => api.delete(`/admin/bookings/${id}`),
  getLogs: (params) => api.get('/admin/logs', { params }),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;
