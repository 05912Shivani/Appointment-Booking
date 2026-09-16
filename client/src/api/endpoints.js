import api from './client.js'

export const AuthAPI = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data),
  logout: () => api.post('/auth/logout'),
}

export const PublicAPI = {
  listProviders: () => api.get('/providers').then((r) => r.data),
  getProvider: (id) => api.get(`/providers/${id}`).then((r) => r.data),
  listServices: (providerId) => api.get(`/providers/${providerId}/services`).then((r) => r.data),
  listSlots: (providerId, serviceId) =>
    api.get(`/providers/${providerId}/slots`, { params: { serviceId } }).then((r) => r.data),
}

export const BookingAPI = {
  hold: (slotId) => api.post('/bookings/hold', { slotId }).then((r) => r.data),
  confirm: (slotId, idempotencyKey) => api.post('/bookings/confirm', { slotId, idempotencyKey }).then((r) => r.data),
  mine: () => api.get('/bookings/me').then((r) => r.data),
  cancel: (bookingId, reason) => api.post(`/bookings/${bookingId}/cancel`, { reason }).then((r) => r.data),
  joinWaitlist: (slotId) => api.post('/bookings/waitlist', { slotId }).then((r) => r.data),
}

export const ProviderAPI = {
  getMe: () => api.get('/providers/me').then((r) => r.data),
  updateMe: (data) => api.put('/providers/me', data).then((r) => r.data),
  listServices: () => api.get('/providers/me/services').then((r) => r.data),
  createService: (data) => api.post('/providers/me/services', data).then((r) => r.data),
  updateService: (id, data) => api.put(`/providers/me/services/${id}`, data).then((r) => r.data),
  deactivateService: (id) => api.delete(`/providers/me/services/${id}`).then((r) => r.data),
  listRules: () => api.get('/providers/me/availability-rules').then((r) => r.data),
  createRule: (data) => api.post('/providers/me/availability-rules', data).then((r) => r.data),
  deleteRule: (id) => api.delete(`/providers/me/availability-rules/${id}`).then((r) => r.data),
  listExceptions: () => api.get('/providers/me/availability-exceptions').then((r) => r.data),
  createException: (data) => api.post('/providers/me/availability-exceptions', data).then((r) => r.data),
  bookings: () => api.get('/providers/me/bookings').then((r) => r.data),
  completeBooking: (id) => api.post(`/providers/me/bookings/${id}/complete`).then((r) => r.data),
  noShowBooking: (id) => api.post(`/providers/me/bookings/${id}/no-show`).then((r) => r.data),
}

export const AdminAPI = {
  listProviders: () => api.get('/admin/providers').then((r) => r.data),
  setProviderActive: (id, isActive) => api.put(`/admin/providers/${id}/active`, { isActive }).then((r) => r.data),
  deleteProvider: (id) => api.delete(`/admin/providers/${id}`).then((r) => r.data),
  analytics: () => api.get('/admin/analytics').then((r) => r.data),
  auditLog: (page = 1) => api.get('/admin/audit-log', { params: { page } }).then((r) => r.data),
}
