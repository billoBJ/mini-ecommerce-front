<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function handleSubmit() {
  error.value = ''
  loading.value = true

  try {
    await auth.login({ email: email.value, password: password.value })
    router.push(route.query.redirect || { name: 'dashboard' })
  } catch (err) {
    error.value = err.response?.data?.message || 'No se pudo iniciar sesión.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <form @submit.prevent="handleSubmit">
      <h1>Iniciar sesión</h1>

      <label>
        Email
        <input v-model="email" type="email" required autocomplete="username" />
      </label>

      <label>
        Contraseña
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Ingresando...' : 'Ingresar' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 320px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.error {
  color: #dc2626;
  margin: 0;
}

button {
  padding: 0.5rem;
  cursor: pointer;
}
</style>
