# QoriERP

Sistema de gestión empresarial multitenant para PyMEs de Bolivia y Latinoamérica. Multi-rubro (licorera, ferretería, farmacia, ropa, autopartes, restaurante) con dos modos de despliegue: SaaS y licencia self-hosted.

## Stack

| Capa | Tecnología |
|---|---|
| API | Node.js + Fastify + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL + RLS |
| Desktop | Tauri 2 + React 19 |
| Auth | JWT + refresh tokens |

## Modos de despliegue

**SaaS** — el proveedor hostea, múltiples tenants, registro público habilitado.

**Self-hosted** — el cliente instala en su VPS, un solo tenant, primer usuario via `POST /setup`.

El cliente Tauri apunta a una `API_BASE_URL` configurable y detecta el modo automáticamente via `GET /api/info`.

## Estructura

```
apps/
  api/        Node.js + Fastify — Clean Architecture + CQRS
  desktop/    Tauri 2 + React 19
packages/
  shared/     Tipos compartidos entre api y desktop
```

## Desarrollo

**Requisitos:** Node.js ≥ 20, pnpm ≥ 9, PostgreSQL 16

```bash
# Instalar dependencias
pnpm install

# Configurar entorno
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env con tus credenciales

# Migrar base de datos
cd apps/api && pnpm db:migrate

# Levantar API
pnpm dev:api

# Levantar desktop
pnpm dev:desktop
```

## API

| Endpoint | Descripción |
|---|---|
| `GET /api/info` | Modo de despliegue y estado de setup |
| `GET /health` | Health check |
| `POST /setup` | Primera instalación (solo self-hosted) |
| `POST /auth/register` | Registrar nuevo tenant (solo SaaS) |
| `POST /auth/login` | Login de usuario |
| `POST /auth/refresh` | Renovar tokens |
| `GET /docs` | Swagger UI |

## Tests

```bash
cd apps/api
pnpm test           # ejecutar tests
pnpm test:coverage  # con cobertura
```
