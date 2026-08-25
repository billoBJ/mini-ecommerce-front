# Billo Commerce — Frontend

SPA en Vue 3 que consume la API de Billo Commerce (repo separado: `mini-ecommerce`, Laravel 13). Autenticación por cookie/sesión vía Sanctum — no hay tokens Bearer en ningún lado de este proyecto.

## Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vite 8**
- **Vue Router 5** — con guards de navegación
- **Pinia** — estado de autenticación
- **Axios** — con `withXSRFToken: true` (manejo nativo del flujo de cookie/CSRF de Sanctum)

## Arquitectura

```
src/
├── services/    Un archivo por recurso de la API (products.js, customers.js, orders.js,
│                 auth.js), cada uno un wrapper delgado sobre una instancia de axios
│                 compartida (api.js). api.js centraliza baseURL, credentials y el
│                 interceptor de 401 — las preocupaciones de auth viven en un solo lugar,
│                 no repetidas en cada componente.
├── stores/       Pinia. auth.js guarda el usuario actual, persistido en localStorage
│                 (la cookie de sesión httpOnly es lo que realmente da acceso — esto es
│                 solo un cache de UI para no tener que llamar a /me en cada carga).
├── router/       Definición de rutas + guards (requiresAuth / guestOnly), leyendo
│                 directamente del store de auth.
└── views/        Una vista por página. Products/Customers/Orders siguen el mismo
                  patrón: fetch al montar, tabla + modal de crear/editar, confirmación
                  de borrado inline, y errores leídos de las respuestas de validación
                  de la API (422).
```

Cada vista mapea 1:1 a un recurso del backend — mismo modelo mental que los controllers-por-recurso de la API.

## Rutas

| Ruta | Vista | Auth |
|---|---|---|
| `/login` | `Login.vue` | pública (redirige a `/` si ya hay sesión) |
| `/` | `Dashboard.vue` | requiere sesión |
| `/products` | `Products.vue` | requiere sesión |
| `/customers` | `Customers.vue` | requiere sesión |
| `/orders` | `Orders.vue` | requiere sesión |

## Autenticación

Mismo flujo que describe el README del backend:

1. `services/auth.js` llama primero a `GET {VITE_APP_URL}/sanctum/csrf-cookie` (sin esto, el login falla con `419`).
2. `login()` postea credenciales — la cookie de sesión queda guardada por el navegador automáticamente.
3. `services/api.js` tiene `withXSRFToken: true`, así que axios agrega el header `X-XSRF-TOKEN` solo en cada request de escritura, leyendo la cookie fresca cada vez (el token rota en login/logout).
4. Un interceptor global en `api.js` atrapa cualquier `401`, limpia el store de auth y redirige a `/login`.

## Orders — la vista replica la máquina de estados del backend

`views/Orders.vue` tiene un mapa local (`STATUS_FLOW`) que refleja `Order::allowedTransitions()` del backend: una orden `pending` solo muestra los botones "Confirmar"/"Cancelar", nunca "Enviar". Esto es **solo para UX** — es el backend el que realmente impone la regla (responde `409` si de alguna forma se intenta un salto inválido); el frontend simplemente evita ofrecer una acción que sabe que va a fallar.

## Instalación

Requiere Node 22+ y el backend corriendo (ver el README de `mini-ecommerce`).

```bash
npm install
cp .env.example .env
npm run dev
```

Queda en `http://localhost:5190` (puerto fijo, `strictPort: true` en `vite.config.js` — no lo cambies sin también actualizar `SANCTUM_STATEFUL_DOMAINS`/`FRONTEND_URL` en el `.env` del backend).

## Variables de entorno

| Variable | Para qué | Default |
|---|---|---|
| `VITE_API_URL` | Base de la API, con `/api` | `http://localhost:8000/api` |
| `VITE_APP_URL` | Raíz de la API, sin `/api` (usada solo para `/sanctum/csrf-cookie`) | `http://localhost:8000` |

## Un detalle importante si algo falla en silencio

Sanctum solo autentica por cookie si el `Origin`/`Referer` de la request coincide con `SANCTUM_STATEFUL_DOMAINS` del backend, **y** el navegador solo adjunta la cookie de sesión (`SameSite=Lax`) si el frontend y la API están en el mismo "sitio" (mismo host — el puerto no importa, pero un IP y `localhost` sí son sitios distintos). Si accedés a la SPA por `localhost:5190` pero `VITE_API_URL` apunta a otra IP (o viceversa), vas a ver: login "exitoso" pero `/me` devolviendo `401` justo después, o `419 CSRF token mismatch`. La solución es mantener consistentes el host desde el que abrís la SPA en el navegador y el host al que `VITE_API_URL`/`VITE_APP_URL` apuntan — los dos `localhost`, o los dos con la misma IP de LAN, nunca mezclados.
