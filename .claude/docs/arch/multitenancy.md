# Arquitectura Multitenant

## Mecanismo: Row-Level Security (RLS)

Una sola instancia de PostgreSQL. Cada fila en todas las tablas de negocio lleva `tenant_id UUID NOT NULL`. Las políticas RLS garantizan que una sesión solo lee y escribe sus propios datos — aislamiento a nivel de BD, no solo de aplicación.

```sql
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON productos
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Cada request autenticado ejecuta antes de cualquier query:
```sql
SET LOCAL app.tenant_id = '<uuid-del-jwt>';
```

## Tablas globales (sin RLS)

Solo la tabla `tenants` no tiene RLS — es de plataforma, accesible con `BYPASSRLS`.

## Self-hosted

En self-hosted hay un único tenant. El mecanismo es idéntico: el JWT lleva `tenantId`, el middleware hace `SET LOCAL`. RLS filtra pero siempre devuelve todo (un solo tenant).

> Spec completo de self-hosted auth: engram `sdd/decisions/self-hosted-auth`

## Multi-rubro

La diferencia entre rubros NO usa tablas separadas. Usa una tabla de atributos flexibles:

```sql
producto_atributos (tenant_id, producto_id, clave, valor)
-- 'talla'       = 'XL'
-- 'color'       = 'rojo'
-- 'codigo_oem'  = 'B2345'
-- 'fecha_venc'  = '2025-12-01'
```

Rubros contemplados: licorera/minimarket, ferretería, autopartes, farmacia, ropa/calzado, restaurante/pizzería, supermercado, otros.
