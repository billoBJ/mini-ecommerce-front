import api from './api'

export function list() {
  return api.get('/orders')
}

export function get(id) {
  return api.get(`/orders/${id}`)
}

export function create(payload) {
  return api.post('/orders', payload)
}

export function updateStatus(id, status) {
  return api.patch(`/orders/${id}/status`, { status })
}
