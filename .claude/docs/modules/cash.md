# Módulo: Cash (Caja + Pagos)

**Estado**: ⬜ Pendiente
**Prerrequisitos**: sucursales, sales, purchases

## 4.5 Caja

- Apertura obligatoria con monto base (fondo para cambio)
- Movimientos extra: ingresos y salidas ajenos a ventas/compras (pasajes, almuerzos, etc.)
- Cierre con arqueo: **saldo calculado** por sistema vs **saldo físico** contado por cajero
- Diferencias requieren justificación obligatoria antes de poder cerrar

```sql
caja_sesiones    -- tenant_id, id, sucursal_id, monto_apertura, monto_cierre, fecha_apertura, fecha_cierre
caja_movimientos -- tenant_id, id, sesion_id, tipo, monto, descripcion, referencia_id
```

## 4.8 Pagos (entidad separada)

Los pagos son **entidad de primera clase** — no un campo dentro de ventas/compras. Resuelve: pagos combinados en POS, cuotas de CxP, abonos de CxC, historial de caja.

```
venta ──→ pago (efectivo, 50 Bs)
      └──→ pago (QR, 70 Bs)

compra_credito ──→ pago (adelanto 30%, hoy)
               └──→ pago (saldo 70%, en 15 días) ← genera CxP
```

Métodos: `efectivo` | `tarjeta` | `transferencia` | `qr` | `credito`

> Las tablas `ventas` y `compras` NO llevan `metodo_pago`. El estado de pago (`pagado`|`parcial`|`pendiente`) se calcula sumando los pagos asociados.

```sql
pagos  -- tenant_id, id, entidad_tipo ('venta'|'compra'|'cxc'|'cxp'|'devolucion'),
       --   entidad_id, sucursal_id, sesion_caja_id, metodo, monto,
       --   referencia_externa, usuario_id, fecha, notas
```
