import api from './api'

export function list() {
  return api.get('/customers')
}

export function get(id) {
  return api.get(`/customers/${id}`)
}

export function create(payload) {
  return api.post('/customers', payload)
}

export function update(id, payload) {
  return api.put(`/customers/${id}`, payload)
}

export function remove(id) {
  return api.delete(`/customers/${id}`)
}
