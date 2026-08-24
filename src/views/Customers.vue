<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as customersService from '../services/customers'

const router = useRouter()

const customers = ref([])
const loading = ref(true)
const listError = ref('')

const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
})

const form = reactive(emptyForm())

async function fetchCustomers() {
  loading.value = true
  listError.value = ''
  try {
    const { data } = await customersService.list()
    customers.value = data.data
  } catch (err) {
    listError.value = err.response?.data?.message || 'No se pudieron cargar los clientes.'
  } finally {
    loading.value = false
  }
}

function startCreate() {
  editingId.value = null
  formError.value = ''
  Object.assign(form, emptyForm())
  showForm.value = true
}

function startEdit(customer) {
  editingId.value = customer.id
  formError.value = ''
  Object.assign(form, {
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    address_line_1: customer.address_line_1 || '',
    address_line_2: customer.address_line_2 || '',
    city: customer.city || '',
    state: customer.state || '',
    postal_code: customer.postal_code || '',
    country: customer.country,
  })
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  formError.value = ''
}

async function submitForm() {
  formError.value = ''
  saving.value = true

  const payload = {
    name: form.name,
    email: form.email,
    phone: form.phone || null,
    address_line_1: form.address_line_1 || null,
    address_line_2: form.address_line_2 || null,
    city: form.city || null,
    state: form.state || null,
    postal_code: form.postal_code || null,
    country: form.country,
  }

  try {
    if (editingId.value) {
      await customersService.update(editingId.value, payload)
    } else {
      await customersService.create(payload)
    }
    showForm.value = false
    await fetchCustomers()
  } catch (err) {
    formError.value = err.response?.data?.message || 'No se pudo guardar el cliente.'
  } finally {
    saving.value = false
  }
}

const confirmingId = ref(null)

function askDelete(customer) {
  confirmingId.value = customer.id
}

function cancelDelete() {
  confirmingId.value = null
}

async function confirmDelete(customer) {
  try {
    await customersService.remove(customer.id)
    await fetchCustomers()
  } catch (err) {
    listError.value = err.response?.data?.message || 'No se pudo eliminar el cliente.'
  } finally {
    confirmingId.value = null
  }
}

onMounted(fetchCustomers)
</script>

<template>
  <div class="customers">
    <header>
      <button class="link" @click="router.push({ name: 'dashboard' })">&larr; Volver</button>
      <h1>Clientes</h1>
      <button @click="startCreate">+ Nuevo cliente</button>
    </header>

    <p v-if="listError" class="error">{{ listError }}</p>
    <p v-if="loading">Cargando...</p>

    <table v-else>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Teléfono</th>
          <th>País</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="customer in customers" :key="customer.id">
          <td>{{ customer.name }}</td>
          <td>{{ customer.email }}</td>
          <td>{{ customer.phone || '—' }}</td>
          <td>{{ customer.country }}</td>
          <td class="actions">
            <template v-if="confirmingId === customer.id">
              <span>¿Seguro?</span>
              <button class="link danger" @click="confirmDelete(customer)">Sí</button>
              <button class="link" @click="cancelDelete">No</button>
            </template>
            <template v-else>
              <button class="link" @click="startEdit(customer)">Editar</button>
              <button class="link danger" @click="askDelete(customer)">Eliminar</button>
            </template>
          </td>
        </tr>
        <tr v-if="customers.length === 0">
          <td colspan="5">No hay clientes todavía.</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showForm" class="overlay" @click.self="cancelForm">
      <form class="panel" @submit.prevent="submitForm">
        <h2>{{ editingId ? 'Editar cliente' : 'Nuevo cliente' }}</h2>

        <label>
          Nombre
          <input v-model="form.name" type="text" required />
        </label>

        <label>
          Email
          <input v-model="form.email" type="email" required />
        </label>

        <div class="row">
          <label>
            Teléfono
            <input v-model="form.phone" type="text" />
          </label>

          <label>
            País
            <input v-model="form.country" type="text" required />
          </label>
        </div>

        <label>
          Dirección
          <input v-model="form.address_line_1" type="text" />
        </label>

        <label>
          Dirección 2
          <input v-model="form.address_line_2" type="text" />
        </label>

        <div class="row">
          <label>
            Ciudad
            <input v-model="form.city" type="text" />
          </label>

          <label>
            Estado/Provincia
            <input v-model="form.state" type="text" />
          </label>

          <label>
            Código postal
            <input v-model="form.postal_code" type="text" />
          </label>
        </div>

        <p v-if="formError" class="error">{{ formError }}</p>

        <div class="row">
          <button type="submit" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
          <button type="button" class="secondary" @click="cancelForm">Cancelar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.customers {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

header h1 {
  margin: 0;
  font-size: 1.25rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.actions {
  display: flex;
  gap: 0.75rem;
}

.link {
  background: none;
  border: none;
  padding: 0;
  color: #2563eb;
  cursor: pointer;
  font: inherit;
}

.link.danger {
  color: #dc2626;
}

.error {
  color: #dc2626;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  width: 460px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.panel h2 {
  margin: 0;
  font-size: 1.1rem;
}

.panel label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.panel .row {
  flex-direction: row;
  gap: 0.75rem;
}

.panel .row label {
  flex: 1;
}

button {
  cursor: pointer;
  padding: 0.5rem 0.75rem;
}

button.secondary {
  background: #e5e7eb;
  border: none;
}
</style>
