# Schema de BD — Referencia de Tablas

> Referencia de diseño conceptual. Las columnas, tipos e índices exactos están en `apps/api/prisma/schema.prisma`.

## Tablas de plataforma (sin RLS — globales)

```sql
tenants  -- id, nombre, slug, plan, deployment_mode, activo, created_at
```

## Tablas de negocio (todas con tenant_id + RLS)

```sql
-- Configuración
configuracion       -- tenant_id, tipo_negocio, moneda, metodo_valuacion, modulos_activos
sucursales          -- tenant_id, id, nombre, direccion, telefono, es_central, activo
categorias          -- tenant_id, id, nombre, parent_id

-- Maestros
proveedores         -- tenant_id, id, nombre, nit_ci, telefono, email
clientes            -- tenant_id, id, nombre, nit_ci, telefono, whatsapp
productos           -- tenant_id, id, nombre, tipo, categoria_id, unidad_medida, es_perecedero, dias_alerta, activo
producto_atributos  -- tenant_id, producto_id, clave, valor
producto_precios    -- tenant_id, producto_id, precio_venta, costo_promedio

-- Inventario
lotes               -- tenant_id, id, sucursal_id, producto_id, cantidad, costo_unitario, fecha_vencimiento, fecha_ingreso
receta_items        -- tenant_id, id, producto_padre_id, producto_hijo_id, cantidad, unidad_medida
ajustes_inventario  -- tenant_id, id, sucursal_id, producto_id, tipo, cantidad, motivo, fecha, usuario_id

-- Transferencias
transferencias      -- tenant_id, id, sucursal_origen_id, sucursal_destino_id, estado, fechas..., usuarios...
transferencia_items -- tenant_id, transferencia_id, producto_id, lote_id, cantidad_solicitada, cantidad_despachada, cantidad_recibida

-- Pagos
pagos               -- tenant_id, id, entidad_tipo, entidad_id, sucursal_id, sesion_caja_id, metodo, monto, referencia_externa, usuario_id, fecha, notas
tipos_cambio        -- tenant_id, id, moneda, tasa, tipo, fecha, usuario_id, notas

-- Compras
compras             -- tenant_id, id, sucursal_id, proveedor_id, fecha, total_bob, estado, moneda, tipo_cambio
compra_items        -- tenant_id, compra_id, producto_id, lote_id, cantidad, costo_unitario_origen, costo_unitario_bob
cuentas_pagar       -- tenant_id, id, compra_id, monto_total, monto_cobrado, fecha_vencimiento, estado

-- Ventas
ventas              -- tenant_id, id, sucursal_id, cliente_id, fecha, total, estado
venta_items         -- tenant_id, venta_id, producto_id, cantidad, precio_unitario, descuento
cotizaciones        -- tenant_id, id, sucursal_id, cliente_id, fecha, fecha_vencimiento, total, convertida
cuentas_cobrar      -- tenant_id, id, venta_id, cliente_id, sucursal_id, monto_total, monto_cobrado, fecha_vencimiento, estado

-- Caja
caja_sesiones       -- tenant_id, id, sucursal_id, monto_apertura, monto_cierre, fecha_apertura, fecha_cierre
caja_movimientos    -- tenant_id, id, sesion_id, tipo, monto, descripcion, referencia_id

-- Anulaciones
anulaciones         -- tenant_id, id, entidad_tipo, entidad_id, usuario_id, sucursal_id, motivo, fecha, detalles_reversion (jsonb)

-- Usuarios
usuarios            -- tenant_id, id, nombre, username, hash_password, rol, activo
usuarios_sucursales -- tenant_id, usuario_id, sucursal_id
roles_permisos      -- tenant_id, rol, modulo, puede_ver, puede_editar

-- Pedidos a proveedores
pedidos             -- tenant_id, id, sucursal_id, proveedor_id, fechas..., estado, moneda, tipo_cambio_estimado, tipo_cambio_recepcion
pedido_items        -- tenant_id, pedido_id, producto_id, cantidad_pedida, cantidad_recibida, precio_unitario_estimado

-- Devoluciones
devoluciones        -- tenant_id, id, sucursal_id, venta_id (nullable), cliente_id, fecha, tipo, motivo, estado, usuario_id
devolucion_items    -- tenant_id, devolucion_id, producto_id, cantidad, condicion, lote_id
devolucion_cambios  -- tenant_id, devolucion_id, producto_id, cantidad, precio_unitario

-- Chat (Fase 3)
chat_mensajes       -- tenant_id, id, remitente_id, sucursal_destino_id, contenido, tipo, referencia_id, leido, created_at
```

## Auth (sin RLS)

```sql
refresh_tokens  -- id, token_hash, usuario_id, tenant_id, role, expires_at, is_used
```
