<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as productsService from '../services/products'

const router = useRouter()

const products = ref([])
const loading = ref(true)
const listError = ref('')

const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  name: '',
  sku: '',
  description: '',
  price: '',
  cost: '',
  stock: 0,
  active: true,
})

const form = reactive(emptyForm())

async function fetchProducts() {
  loading.value = true
  listError.value = ''
  try {
    const { data } = await productsService.list()
    products.value = data.data
  } catch (err) {
    listError.value = err.response?.data?.message || 'No se pudieron cargar los productos.'
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

function startEdit(product) {
  editingId.value = product.id
  formError.value = ''
  Object.assign(form, {
    name: product.name,
    sku: product.sku,
    description: product.description || '',
    price: product.price,
    cost: product.cost || '',
    stock: product.stock,
    active: product.active,
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
    sku: form.sku,
    description: form.description || null,
    price: form.price,
    cost: form.cost === '' ? null : form.cost,
    stock: form.stock,
  }

  try {
    if (editingId.value) {
      await productsService.update(editingId.value, { ...payload, active: form.active })
    } else {
      await productsService.create(payload)
    }
    showForm.value = false
    await fetchProducts()
  } catch (err) {
    formError.value = err.response?.data?.message || 'No se pudo guardar el producto.'
  } finally {
    saving.value = false
  }
}

const confirmingId = ref(null)

function askDelete(product) {
  confirmingId.value = product.id
}

function cancelDelete() {
  confirmingId.value = null
}

async function confirmDelete(product) {
  try {
    await productsService.remove(product.id)
    await fetchProducts()
  } catch (err) {
    listError.value = err.response?.data?.message || 'No se pudo eliminar el producto.'
  } finally {
    confirmingId.value = null
  }
}

onMounted(fetchProducts)
</script>

<template>
  <div class="products">
    <header>
      <button class="link" @click="router.push({ name: 'dashboard' })">&larr; Volver</button>
      <h1>Productos</h1>
      <button @click="startCreate">+ Nuevo producto</button>
    </header>

    <p v-if="listError" class="error">{{ listError }}</p>
    <p v-if="loading">Cargando...</p>

    <table v-else>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>SKU</th>
          <th>Precio</th>
          <th>Stock</th>
          <th>Activo</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="product in products" :key="product.id">
          <td>{{ product.name }}</td>
          <td>{{ product.sku }}</td>
          <td>{{ product.price }}</td>
          <td>{{ product.stock }}</td>
          <td>{{ product.active ? 'Sí' : 'No' }}</td>
          <td class="actions">
            <template v-if="confirmingId === product.id">
              <span>¿Seguro?</span>
              <button class="link danger" @click="confirmDelete(product)">Sí</button>
              <button class="link" @click="cancelDelete">No</button>
            </template>
            <template v-else>
              <button class="link" @click="startEdit(product)">Editar</button>
              <button class="link danger" @click="askDelete(product)">Eliminar</button>
            </template>
          </td>
        </tr>
        <tr v-if="products.length === 0">
          <td colspan="6">No hay productos todavía.</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showForm" class="overlay" @click.self="cancelForm">
      <form class="panel" @submit.prevent="submitForm">
        <h2>{{ editingId ? 'Editar producto' : 'Nuevo producto' }}</h2>

        <label>
          Nombre
          <input v-model="form.name" type="text" required />
        </label>

        <label>
          SKU
          <input v-model="form.sku" type="text" required />
        </label>

        <label>
          Descripción
          <textarea v-model="form.description" rows="2"></textarea>
        </label>

        <div class="row">
          <label>
            Precio
            <input v-model="form.price" type="number" step="0.01" min="0" required />
          </label>

          <label>
            Costo
            <input v-model="form.cost" type="number" step="0.01" min="0" />
          </label>

          <label>
            Stock
            <input v-model="form.stock" type="number" step="1" min="0" required />
          </label>
        </div>

        <label v-if="editingId" class="checkbox">
          <input v-model="form.active" type="checkbox" />
          Activo
        </label>

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
.products {
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
  width: 420px;
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

.panel .checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
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
