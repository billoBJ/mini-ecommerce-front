<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (!auth.user) {
    auth.fetchUser()
  }
})

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="dashboard">
    <header>
      <span v-if="auth.user">Hola, {{ auth.user.name }} ({{ auth.user.email }})</span>
      <button @click="handleLogout">Cerrar sesión</button>
    </header>
  </div>
</template>

<style scoped>
.dashboard header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}
</style>
