import api from './api'

export function list() {
  return api.get('/products')
}

export function get(id) {
  return api.get(`/products/${id}`)
}

export function create(payload) {
  return api.post('/products', payload)
}

export function update(id, payload) {
  return api.put(`/products/${id}`, payload)
}

export function remove(id) {
  return api.delete(`/products/${id}`)
}
