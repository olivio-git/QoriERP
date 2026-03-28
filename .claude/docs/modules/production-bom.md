# Módulo: Production & BOM (Recetas)

**Estado**: ⬜ Fase 3 — solo para restaurante/manufactura
**Prerrequisitos**: product-catalog, inventory

> Este módulo se activa únicamente para negocios tipo restaurante, pizzería, panadería, manufactura. Configurable en `configuracion.modulos_activos`.

## Tipos de ítem

| Tipo | Descripción | Ejemplo |
|---|---|---|
| Producto final | Se vende, tiene receta | Pizza Napolitana |
| Sub-producto | Se produce internamente, no se vende solo | Masa base, Salsa de tomate |
| Insumo directo | Se compra y consume en producción | Harina, Queso |
| Perecedero | Cualquier tipo con fecha de vencimiento obligatoria | Tomate, Queso |

## Estructura de receta (BOM recursivo)

Tabla autorreferencial — profundidad infinita:

```sql
receta_items (tenant_id, id, producto_padre_id, producto_hijo_id, cantidad, unidad_medida)
```

Ejemplo: Pizza Napolitana
```
Pizza Napolitana
├── Masa base (sub-producto)
│   ├── Harina 500g
│   ├── Levadura 10g
│   └── Agua 300ml
├── Salsa de tomate (sub-producto)
│   ├── Tomate 200g
│   └── Orégano 5g
├── Queso mozzarella 150g
└── Jamón 80g
```

## Explosión de BOM al vender

Al registrar una venta con producto que tiene receta:
1. Recorre todos los niveles (explosión completa)
2. Descuenta stock de cada insumo
3. Aplica método de valuación configurado (PEPS para perecederos)
4. Registra movimiento en Kardex de cada insumo

> **Edge case crítico**: detectar y rechazar referencias circulares (A contiene B que contiene A).
