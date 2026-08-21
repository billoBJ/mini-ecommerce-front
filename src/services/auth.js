import axios from 'axios'
import api from './api'

export function getCsrfCookie() {
  return axios.get(`${import.meta.env.VITE_APP_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
  })
}

export async function login(credentials) {
  await getCsrfCookie()
  return api.post('/auth/login', credentials)
}

export function logout() {
  return api.post('/auth/logout')
}

export function me() {
  return api.get('/auth/me')
}
