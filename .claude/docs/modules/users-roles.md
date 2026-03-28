# Módulo: Users & Roles

**Estado**: ⬜ Pendiente — después de sucursales
**Prerrequisitos**: auth-foundation ✅, sucursales

## Roles

| Rol | Acceso |
|---|---|
| **admin** | Acceso total |
| **cajero** | Permisos restringidos configurables |

Permisos configurables por tenant: ocultar reportes de ganancias, deshabilitar edición de precios, restringir gestión de proveedores, etc.

## Funcionalidades

- CRUD de usuarios: nombre, username, contraseña, rol, activo
- **Asignación a sucursales**: un usuario opera en una o varias sucursales (`usuarios_sucursales`)
- El primer usuario admin se crea en `POST /auth/register` (SaaS) o `POST /setup` (self-hosted)
- Los usuarios adicionales se crean por el admin autenticado vía `POST /users`

## Tablas

```sql
usuarios            -- tenant_id, id, nombre, username, hash_password, rol, activo
usuarios_sucursales -- tenant_id, usuario_id, sucursal_id
roles_permisos      -- tenant_id, rol, modulo, puede_ver, puede_editar
```

## Endpoints esperados

```
GET    /users           lista de usuarios del tenant
POST   /users           crear usuario (requiere admin)
PATCH  /users/:id       editar usuario
DELETE /users/:id       inactivar usuario

POST   /users/:id/branches    asignar sucursales al usuario
DELETE /users/:id/branches/:branchId  remover asignación
```
