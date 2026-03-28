# Módulo: Purchases (Compras + Pedidos)

**Estado**: ⬜ Pendiente
**Prerrequisitos**: product-catalog, sucursales, inventory

## 4.2 Compras

- Gestión de proveedores con NIT o CI
- Registro de compras con selección de productos y cantidades
- **Moneda configurable** (BOB, USD, ARS, BRL, etc.) con tipo de cambio al momento
- Precio unitario almacenado en moneda origen Y en BOB
- Tipo de cambio pre-rellenado desde última tasa registrada, editable antes de confirmar
- Actualización de precio de venta si varió el costo
- Métodos de pago: efectivo, tarjeta, transferencia, crédito (ver módulo cash)
- Cuentas por pagar: deuda con pagos parciales o totales posteriores
- Impacto automático en caja al pagar efectivo
- **Generación de lotes** al ingresar mercadería (requerido para PEPS y control vencimientos)

```sql
proveedores     -- tenant_id, id, nombre, nit_ci, telefono, email
compras         -- tenant_id, id, sucursal_id, proveedor_id, fecha, total_bob, estado, moneda, tipo_cambio
compra_items    -- tenant_id, compra_id, producto_id, lote_id, cantidad, costo_unitario_origen, costo_unitario_bob
cuentas_pagar   -- tenant_id, id, compra_id, monto_total, monto_cobrado, fecha_vencimiento, estado
```

## 4.14 Pedidos a Proveedores (Órdenes de Compra)

Orden formal antes de que llegue la mercadería. Al recibir → se convierte en compra con un clic.

### Workflow
```
BORRADOR → ENVIADO → EN_TRANSITO → PARCIALMENTE_RECIBIDO → COMPLETADO
               ↓           ↓                  ↓
           CANCELADO   CANCELADO          CANCELADO
```

- Registra `tipo_cambio_estimado` al crear y `tipo_cambio_recepcion` al recibir
- Recepción parcial: `cantidad_pedida` vs `cantidad_recibida` por ítem
- Al completar: genera `compra` automáticamente con tipo de cambio de recepción

```sql
pedidos       -- tenant_id, id, sucursal_id, proveedor_id, fecha_pedido, fecha_esperada,
              --   fecha_llegada_estimada, tracking, transportista, estado, notas, compra_id,
              --   moneda, tipo_cambio_estimado, tipo_cambio_recepcion
pedido_items  -- tenant_id, pedido_id, producto_id, cantidad_pedida, cantidad_recibida,
              --   precio_unitario_origen, precio_unitario_bob_estimado
```
