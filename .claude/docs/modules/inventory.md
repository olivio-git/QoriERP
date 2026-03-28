# Módulo: Inventory (Inventario + Valuación)

**Estado**: ⬜ Pendiente
**Prerrequisitos**: product-catalog, sucursales

## Alcance

Stock físico por sucursal. Cada producto tiene uno o más lotes por sucursal con costo unitario y fecha de vencimiento.

## Funcionalidades

- Existencias actuales por sucursal
- Kardex por producto: historial de movimientos (compras, ventas, ajustes, transferencias)
- Vencimientos próximos (configurable X días de anticipación)
- **Ajustes de inventario positivos** (bonificaciones de proveedor) y **negativos** (merma, vencido, pérdida) con motivo obligatorio
- **Carga inicial de stock**: masiva desde cero tras conteo físico
- Stock mínimo/máximo con alertas automáticas

## Estructura de lotes

```sql
lotes  -- tenant_id, id, sucursal_id, producto_id, cantidad,
       --   costo_unitario, fecha_vencimiento (null si no perecedero),
       --   fecha_ingreso, proveedor_id

ajustes_inventario  -- tenant_id, id, sucursal_id, producto_id,
                    --   tipo ('positivo'|'negativo'), cantidad, motivo, fecha, usuario_id
```

## Métodos de Valuación

Se configura **una sola vez** al crear el negocio en `configuracion.metodo_valuacion`. No cambia la estructura de BD — cambia el algoritmo al calcular costos y descontar lotes.

| Método | Descripción | Cuándo usar |
|---|---|---|
| **PEPS (FIFO)** | Primera entrada, primera salida. Lote más antiguo primero | Obligatorio para perecederos |
| **UEPS (LIFO)** | Última entrada, primera salida | Contextos inflacionarios |
| **CPP** | Costo Promedio Ponderado | El más común en reventa simple |

Al vender: el sistema selecciona el lote según el método y descuenta la cantidad. Al comprar: genera un nuevo lote con `costo_unitario` y `fecha_ingreso`.
