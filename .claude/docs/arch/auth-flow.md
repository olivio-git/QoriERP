# Flujo de Autenticación

## Endpoint de bootstrap

```
GET /api/info  ← público, sin auth
→ { version, mode: 'saas'|'self-hosted', setupRequired: boolean }
```

El cliente Tauri llama esto al arrancar para decidir qué pantalla mostrar.

## Modo SaaS

```
POST /auth/register  { tenantName, slug, adminUsername, adminPassword }
POST /auth/login     { username, password, tenantSlug }  ← requerido
POST /auth/refresh   { refreshToken }
```

## Modo Self-hosted

```
POST /setup      { businessName, adminUsername, adminPassword }
  → Solo funciona si DEPLOYMENT_MODE=self-hosted Y tenants=0
  → slug auto-generado desde businessName
  → 409 si ya existe un tenant

POST /auth/login { username, password }  ← tenantSlug omitido
  → backend resuelve el único tenant desde BD
```

## JWT

Payload: `{ sub: userId, tenantId, role: 'admin'|'cajero' }`
- Access token: 15m (configurable JWT_ACCESS_TTL)
- Refresh token: 7d (configurable JWT_REFRESH_TTL_DAYS), hasheado en BD

## RLS por request

```
JWT válido → extrae tenantId → SET LOCAL app.tenant_id = uuid → PostgreSQL RLS filtra
```

> Spec técnico completo: engram `sdd/decisions/self-hosted-auth`
