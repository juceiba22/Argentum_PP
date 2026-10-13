# Argentum · Software de gestión para carnicerías

Argentum es un ERP/POS web pensado exclusivamente para carnicerías argentinas.

## Qué incluye

- **Mostrador (POS) por kilo**: venta por peso de balanza, gramos o unidades.
- **Facturación electrónica ARCA**: Facturas A y B con CAE, por delegación del web service (sin certificado propio).
- **Cobros**: efectivo, Mercado Pago Point integrado, Cuenta DNI, tarjetas y transferencia.
- **Stock de cortes** en kg y **compras a frigoríficos/proveedores**.
- **Costo real por kg**: prorrateo de gastos fijos, sueldos y amortización de equipos (cámara, sierra, picadora).
- **Caja y liquidez**: apertura/cierre de caja, gastos e ingresos.
- **Promociones** y catálogo online público (`/promociones`) con pedidos por WhatsApp.
- **Clientes** con historial y perfil de **vendedor de mostrador**.

Cada alta nueva se crea con rubro *Carnicería* y un catálogo inicial de cortes
(`src/utils/starterProducts.js`).

## Rutas principales

| Ruta | Descripción |
| --- | --- |
| `/` | Landing pública (si hay sesión, redirige a la app) |
| `/login` | Ingreso y alta (`/login?registro=1` abre directo el alta) |
| `/promociones` | Catálogo público de ofertas |
| `/market` | Mostrador / POS |

## Stack

React 19 + Vite, Supabase (auth, base de datos y edge functions) y funciones
serverless en Vercel (`api/`) para ARCA y Mercado Pago.

## Desarrollo

```bash
npm install
cp .env.example .env   # completar credenciales
npm run dev
```

Build de producción: `npm run build`. El deploy a producción se hace desde la rama `main`.
