# Módulos Auxiliares

## Tipos de Cambio (4.10)

Registro histórico de tasas por moneda. Sin fetch automático de APIs — el admin registra manualmente.

- Tipos: `oficial` | `paralelo` | `personalizado`
- Al crear compra/pedido: pre-rellena con la última tasa registrada para esa moneda (editable)
- Reportes pueden normalizar costos a USD para comparación histórica

```sql
tipos_cambio  -- tenant_id, id, moneda ('USD'|'ARS'|'BRL'|...), tasa,
              --   tipo, fecha, usuario_id, notas
```

---

## Anulaciones (4.11)

Las anulaciones nunca borran registros. Toda transacción anulable tiene estado `ANULADA` + registro de auditoría. Aplica a: ventas, compras, transferencias, pedidos, cotizaciones.

| Entidad | Reversión stock | Reversión caja | Quién puede |
|---|---|---|---|
| Venta | Stock vuelve a sucursal | Egreso si fue efectivo | Admin (cajero con permiso) |
| Compra | Lotes eliminados/ajustados | Ingreso si fue efectivo | Admin |
| Transferencia | Stock vuelve a origen | No aplica | Admin |
| Pedido | Sin impacto | No aplica | Admin o solicitante |
| Cotización | Sin impacto | No aplica | Admin o vendedor |

Restricciones:
- Venta: no anulable si sesión de caja ya cerrada (requiere permiso especial)
- Compra: no anulable si lote generado ya fue consumido parcialmente
- Toda anulación requiere **motivo obligatorio**

```sql
anulaciones  -- tenant_id, id, entidad_tipo, entidad_id, usuario_id,
             --   sucursal_id, motivo, fecha, detalles_reversion (jsonb)
```

---

## Chat Interno (4.13)

> **Diferido a Fase 3.** La infraestructura de sucursales debe estar estable antes.

- Mensajes en tiempo real por WebSockets (Fastify WS plugin)
- Canales por sucursal + mensajes directos
- Solicitud de reposición integrada: desde el chat se pre-completa una transferencia
- Notificaciones de cambios de estado en transferencias activas

```sql
chat_mensajes  -- tenant_id, id, remitente_id, sucursal_destino_id,
               --   contenido, tipo ('texto'|'solicitud_transferencia'),
               --   referencia_id, leido, created_at
```
