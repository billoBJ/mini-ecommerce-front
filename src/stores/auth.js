import { defineStore } from 'pinia'
import * as authService from '../services/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    async login(credentials) {
      const { data } = await authService.login(credentials)
      this.setUser(data.data.user)
    },

    async logout() {
      try {
        await authService.logout()
      } finally {
        this.clearUser()
      }
    },

    async fetchUser() {
      const { data } = await authService.me()
      this.setUser(data.data)
    },

    setUser(user) {
      this.user = user
      localStorage.setItem('user', JSON.stringify(user))
    },

    clearUser() {
      this.user = null
      localStorage.removeItem('user')
    },
  },
})
