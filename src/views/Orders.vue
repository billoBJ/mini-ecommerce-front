<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as ordersService from '../services/orders'
import * as customersService from '../services/customers'
import * as productsService from '../services/products'

const router = useRouter()

const orders = ref([])
const customers = ref([])
const products = ref([])
const loading = ref(true)
const listError = ref('')

// Mirrors Order::allowedTransitions() on the backend — the frontend
// respects the same state machine so it only ever offers valid moves.
// The backend is still the source of truth: if these ever drift out of
// sync, the API responds with 409 and the error shows up per-order.
const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  processing: 'En proceso',
  shipped: 'Enviada',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status
}

function nextStatuses(status) {
  return STATUS_FLOW[status] || []
}

function customerName(id) {
  const customer = customers.value.find((c) => c.id === id)
  return customer ? customer.name : `Cliente #${id}`
}

async function fetchAll() {
  loading.value = true
  listError.value = ''
  try {
    const [ordersRes, customersRes, productsRes] = await Promise.all([
      ordersService.list(),
      customersService.list(),
      productsService.list(),
    ])
    orders.value = ordersRes.data.data
    customers.value = customersRes.data.data
    products.value = productsRes.data.data
  } catch (err) {
    listError.value = err.response?.data?.message || 'No se pudieron cargar las órdenes.'
  } finally {
    loading.value = false
  }
}

const expandedId = ref(null)

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

const transitioning = ref(null)
const transitionError = reactive({})

async function changeStatus(order, status) {
  transitioning.value = order.id
  transitionError[order.id] = ''
  try {
    const { data } = await ordersService.updateStatus(order.id, status)
    const index = orders.value.findIndex((o) => o.id === order.id)
    orders.value[index] = data.data
  } catch (err) {
    transitionError[order.id] = err.response?.data?.message || 'No se pudo cambiar el estado.'
  } finally {
    transitioning.value = null
  }
}

const showForm = ref(false)
const saving = ref(false)
const formError = ref('')

const emptyForm = () => ({
  customer_id: '',
  items: [{ product_id: '', quantity: 1 }],
  notes: '',
})

const form = reactive(emptyForm())

function addItem() {
  form.items.push({ product_id: '', quantity: 1 })
}

function removeItem(index) {
  form.items.splice(index, 1)
}

function startCreate() {
  Object.assign(form, emptyForm())
  form.items = [{ product_id: '', quantity: 1 }]
  formError.value = ''
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  formError.value = ''
}

// Preview only — the real subtotal/tax/total are always computed by the
// server from the items it resolves, this is just so the user isn't
// filling out a form with zero feedback.
const previewSubtotal = computed(() => {
  return form.items.reduce((sum, item) => {
    const product = products.value.find((p) => p.id === item.product_id)
    if (!product || !item.quantity) return sum
    return sum + Number(product.price) * Number(item.quantity)
  }, 0)
})

async function submitForm() {
  formError.value = ''
  saving.value = true

  const payload = {
    customer_id: form.customer_id,
    items: form.items
      .filter((item) => item.product_id && item.quantity)
      .map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
    notes: form.notes || null,
  }

  try {
    await ordersService.create(payload)
    showForm.value = false
    await fetchAll()
  } catch (err) {
    formError.value = err.response?.data?.message || 'No se pudo crear la orden.'
  } finally {
    saving.value = false
  }
}

onMounted(fetchAll)
</script>

<template>
  <div class="orders">
    <header>
      <button class="link" @click="router.push({ name: 'dashboard' })">&larr; Volver</button>
      <h1>Órdenes</h1>
      <button @click="startCreate">+ Nueva orden</button>
    </header>

    <p v-if="listError" class="error">{{ listError }}</p>
    <p v-if="loading">Cargando...</p>

    <table v-else>
      <thead>
        <tr>
          <th>#</th>
          <th>Cliente</th>
          <th>Estado</th>
          <th>Items</th>
          <th>Total</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="order in orders" :key="order.id">
          <tr>
            <td>{{ order.id }}</td>
            <td>{{ customerName(order.customer_id) }}</td>
            <td><span class="badge" :class="order.status">{{ statusLabel(order.status) }}</span></td>
            <td>{{ order.items.length }}</td>
            <td>{{ order.total }} {{ order.currency }}</td>
            <td class="actions">
              <button class="link" @click="toggleExpand(order.id)">
                {{ expandedId === order.id ? 'Ocultar' : 'Ver' }}
              </button>
            </td>
          </tr>
          <tr v-if="expandedId === order.id" class="detail-row">
            <td colspan="6">
              <div class="detail">
                <table class="items">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th>Precio</th>
                      <th>Cant.</th>
                      <th>Desc.</th>
                      <th>Total línea</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in order.items" :key="item.id">
                      <td>{{ item.name }}</td>
                      <td>{{ item.sku }}</td>
                      <td>{{ item.price }}</td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ item.discount }}</td>
                      <td>{{ item.total }}</td>
                    </tr>
                  </tbody>
                </table>

                <p v-if="order.notes" class="notes">Notas: {{ order.notes }}</p>

                <div class="transition">
                  <span v-if="nextStatuses(order.status).length === 0" class="muted">
                    Sin más transiciones disponibles.
                  </span>
                  <button
                    v-for="next in nextStatuses(order.status)"
                    :key="next"
                    type="button"
                    class="secondary"
                    :disabled="transitioning === order.id"
                    @click="changeStatus(order, next)"
                  >
                    {{ next === 'cancelled' ? 'Cancelar' : `Marcar como ${statusLabel(next)}` }}
                  </button>
                </div>
                <p v-if="transitionError[order.id]" class="error">{{ transitionError[order.id] }}</p>
              </div>
            </td>
          </tr>
        </template>
        <tr v-if="orders.length === 0">
          <td colspan="6">No hay órdenes todavía.</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showForm" class="overlay" @click.self="cancelForm">
      <form class="panel" @submit.prevent="submitForm">
        <h2>Nueva orden</h2>

        <label>
          Cliente
          <select v-model="form.customer_id" required>
            <option value="" disabled>Selecciona un cliente</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>

        <div class="items-form">
          <div v-for="(item, index) in form.items" :key="index" class="item-row">
            <select v-model="item.product_id" required>
              <option value="" disabled>Producto</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }}) — {{ p.price }}</option>
            </select>
            <input v-model.number="item.quantity" type="number" min="1" step="1" required placeholder="Cant." />
            <button
              type="button"
              class="link danger"
              :disabled="form.items.length === 1"
              @click="removeItem(index)"
            >
              Quitar
            </button>
          </div>
          <button type="button" class="link" @click="addItem">+ Agregar producto</button>
        </div>

        <label>
          Notas
          <textarea v-model="form.notes" rows="2"></textarea>
        </label>

        <p class="preview">Subtotal estimado: {{ previewSubtotal.toFixed(2) }} (el total real, con impuestos, lo calcula el servidor)</p>

        <p v-if="formError" class="error">{{ formError }}</p>

        <div class="row">
          <button type="submit" :disabled="saving">{{ saving ? 'Creando...' : 'Crear orden' }}</button>
          <button type="button" class="secondary" @click="cancelForm">Cancelar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.orders {
  max-width: 1000px;
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

.detail-row td {
  background: #f9fafb;
  padding: 1rem;
}

.detail .items {
  margin-bottom: 0.75rem;
}

.notes {
  color: #4b5563;
  font-size: 0.9rem;
}

.transition {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.muted {
  color: #6b7280;
  font-size: 0.9rem;
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.badge.pending {
  background: #f3f4f6;
  color: #374151;
}

.badge.confirmed {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge.processing {
  background: #fef3c7;
  color: #b45309;
}

.badge.shipped {
  background: #ede9fe;
  color: #6d28d9;
}

.badge.completed {
  background: #dcfce7;
  color: #15803d;
}

.badge.cancelled {
  background: #fee2e2;
  color: #b91c1c;
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

.link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  width: 520px;
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

.items-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.item-row select {
  flex: 1;
}

.item-row input {
  width: 70px;
}

.preview {
  font-size: 0.85rem;
  color: #4b5563;
}

.panel .row {
  flex-direction: row;
  gap: 0.75rem;
}

button {
  cursor: pointer;
  padding: 0.5rem 0.75rem;
}

button.secondary {
  background: #e5e7eb;
  border: none;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
