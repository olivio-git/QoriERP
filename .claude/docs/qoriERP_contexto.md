# QoriERP — Contexto del Proyecto

Sistema ERP multitenant comercial para PyMEs de Bolivia y Latinoamérica. Multi-rubro con dos modos de despliegue: **SaaS** (proveedor hostea, múltiples tenants) y **Self-hosted** (cliente instala en su VPS, un solo tenant). El cliente Tauri apunta a una `API_BASE_URL` configurable — agnóstico al modo.

---

## Stack

| Capa | Tecnología |
|---|---|
| API | Node.js + Fastify + TypeScript — Clean Architecture + CQRS |
| ORM | Prisma |
| Base de datos | PostgreSQL + Row-Level Security |
| Desktop | Tauri 2 + React 19 |
| Auth | JWT (15m) + refresh tokens (7d) |
| Monorepo | pnpm workspaces |

---

## Modos de despliegue

```
# SaaS (proveedor)          # Self-hosted (cliente VPS)
DEPLOYMENT_MODE=saas         DEPLOYMENT_MODE=self-hosted
ALLOW_REGISTRATION=true      ALLOW_REGISTRATION=false
```

El cliente detecta el modo via `GET /api/info → { mode, setupRequired }`.
Primera instalación self-hosted: `POST /setup` (una sola vez).

> Detalle: [arch/auth-flow.md](arch/auth-flow.md) | Spec self-hosted: engram `sdd/decisions/self-hosted-auth`

---

## Arquitectura

- Multitenancy por RLS: cada fila tiene `tenant_id`, `SET LOCAL app.tenant_id` antes de cada query
- Multi-rubro por atributos flex: `producto_atributos (clave, valor)` — sin tablas separadas por rubro

> Detalle: [arch/multitenancy.md](arch/multitenancy.md)

---

## Módulos

| # | Módulo | Estado | Doc |
|---|---|---|---|
| 0 | auth-foundation | ✅ | engram `sdd/changes/auth-foundation/*` |
| 1 | product-catalog | 🔜 | [modules/product-catalog.md](modules/product-catalog.md) |
| 2 | sucursales | ⬜ | [modules/branches.md](modules/branches.md) |
| 3 | user-management | ⬜ | [modules/users-roles.md](modules/users-roles.md) |
| 4 | inventory | ⬜ | [modules/inventory.md](modules/inventory.md) |
| 5 | purchases | ⬜ | [modules/purchases.md](modules/purchases.md) |
| 6 | sales / POS | ⬜ | [modules/sales.md](modules/sales.md) |
| 7 | cash | ⬜ | [modules/cash.md](modules/cash.md) |
| 8 | production / BOM | ⬜ Fase 3 | [modules/production-bom.md](modules/production-bom.md) |
| — | aux (tipos cambio, anulaciones, chat) | ⬜ | [modules/aux.md](modules/aux.md) |

> Schema de BD: [schema/tables.md](schema/tables.md)

---

## Orden de desarrollo

```
auth-foundation ✅
      │
 product-catalog 🔜
      │
  sucursales → user-management
      │
   inventory
      │
 purchases + sales/POS (paralelo)
      │
    cash
      │
  (Fase 3) production/BOM, chat
```

---

## Repositorio

GitHub: https://github.com/olivio-git/QoriERP
- Rama de trabajo: `develop`
- `main` protegido — requiere PR + aprobación
