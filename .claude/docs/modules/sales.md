# Módulo: Sales (Ventas + Cotizaciones + CxC + Devoluciones)

**Estado**: ⬜ Pendiente
**Prerrequisitos**: product-catalog, sucursales, inventory, cash

## 4.3 Ventas / POS

- Venta a cliente genérico o cliente registrado
- Interfaz **modo lista** y **modo menú visual** con imágenes (tipo POS táctil)
- Compatibilidad con lectores de código de barras USB/HID
- Escaneo por cámara del dispositivo
- Descuentos por ítem o sobre el total
- Pagos combinados: efectivo + transferencia + QR en una transacción
- Generación de nota de entrega / comprobante
- Envío de comprobante por WhatsApp al cliente
- Impresión directa en impresora térmica

```sql
clientes     -- tenant_id, id, nombre, nit_ci, telefono, whatsapp
ventas       -- tenant_id, id, sucursal_id, cliente_id, fecha, total, estado
venta_items  -- tenant_id, venta_id, producto_id, cantidad, precio_unitario, descuento
```

## 4.4 Cotizaciones

- Presupuestos con fecha límite de validez configurable
- Conversión a venta con un clic
- Edición de cantidades finales al confirmar

```sql
cotizaciones  -- tenant_id, id, sucursal_id, cliente_id, fecha, fecha_vencimiento, total, convertida
```

## 4.9 Cuentas por Cobrar (CxC)

Cuando una venta se registra con método `credito` se genera automáticamente una CxC.

- Seguimiento de deuda por cliente con saldo en tiempo real
- Pagos parciales
- Estado automático: `al_dia` | `por_vencer` | `vencido`
- Aging report: 0-30d, 31-60d, 61-90d, +90d
- Bloqueo opcional de nuevas ventas a crédito con CxC vencidas (configurable)

```sql
cuentas_cobrar  -- tenant_id, id, venta_id, cliente_id, sucursal_id,
                --   monto_total, monto_cobrado, fecha_vencimiento, estado
```

## 4.15 Devoluciones de Clientes

| Tipo | Descripción |
|---|---|
| **Cambio** | Devuelve X productos, lleva Y. Diferencia de precio a favor/contra |
| **Reembolso** | Devuelve dinero. Impacta en caja |

Condición del producto devuelto:
- `resaleable` → vuelve al inventario (genera lote de reingreso)
- `dañado` / `vencido` → ajuste negativo con motivo

```sql
devoluciones       -- tenant_id, id, sucursal_id, venta_id (nullable), cliente_id,
                   --   fecha, tipo, motivo, estado, usuario_id
devolucion_items   -- tenant_id, devolucion_id, producto_id, cantidad, condicion, lote_id
devolucion_cambios -- tenant_id, devolucion_id, producto_id, cantidad, precio_unitario
```
