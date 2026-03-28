# Módulo: Branches (Sucursales + Transferencias)

**Estado**: ⬜ Pendiente — después de product-catalog
**Prerrequisitos**: auth-foundation ✅

## Concepto

Cada tenant puede tener múltiples sucursales. Una se marca como **central** (`es_central = true`) — actúa como almacén principal. El stock es **independiente por sucursal**.

## Impacto en el esquema

Estas tablas tienen `sucursal_id`:

| Tabla | Por qué |
|---|---|
| `lotes` | Stock físico está en una sucursal |
| `ventas` | Una venta ocurre en una sucursal |
| `compras` | Una compra ingresa a una sucursal |
| `caja_sesiones` | Cada sucursal tiene su propia caja |
| `usuarios_sucursales` | Un usuario opera en una o varias sucursales |
| `ajustes_inventario` | El ajuste afecta stock de una sucursal |

## Transferencias entre sucursales

### Workflow
```
SOLICITADA → APROBADA → EN_TRANSITO → RECIBIDA
                  ↓
             RECHAZADA
```

1. **SOLICITADA**: destino (o admin) crea solicitud con productos y cantidades
2. **APROBADA**: origen revisa. Stock queda reservado (no disponible para venta)
3. **EN_TRANSITO**: origen confirma despacho. Stock sale de origen
4. **RECIBIDA**: destino confirma recepción. Si hay diferencia → discrepancia con motivo obligatorio
5. **RECHAZADA**: origen rechaza con motivo. Sin impacto en stock

```sql
sucursales          -- tenant_id, id, nombre, direccion, telefono, es_central, activo
transferencias      -- tenant_id, id, sucursal_origen_id, sucursal_destino_id, estado,
                    --   fecha_solicitud, fecha_despacho, fecha_recepcion,
                    --   solicitante_id, despachador_id, receptor_id, notas
transferencia_items -- tenant_id, transferencia_id, producto_id, lote_id,
                    --   cantidad_solicitada, cantidad_despachada, cantidad_recibida
```
