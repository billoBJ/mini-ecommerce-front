import { defineStore } from 'pinia'
import * as authService from '../services/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token'),
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    async login(credentials) {
      const { data } = await authService.login(credentials)
      this.setSession(data.data.user, data.data.token)
    },

    async logout() {
      try {
        await authService.logout()
      } finally {
        this.clearSession()
      }
    },

    async fetchUser() {
      const { data } = await authService.me()
      this.user = data.data
      localStorage.setItem('user', JSON.stringify(data.data))
    },

    setSession(user, token) {
      this.user = user
      this.token = token
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('token', token)
    },

    clearSession() {
      this.user = null
      this.token = null
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    },
  },
})
