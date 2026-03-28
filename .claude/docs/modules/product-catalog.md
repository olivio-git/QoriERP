# Módulo: Product Catalog

**Estado**: 🔜 Próximo a implementar
**Prerrequisitos**: auth-foundation ✅
**Depende de este**: inventory, purchases, sales/POS

## Alcance

Gestión del catálogo de productos a nivel tenant. Los productos NO tienen `sucursal_id` — son globales para el negocio. El stock por sucursal vive en `lotes` (módulo inventory).

## Funcionalidades

### Categorías
- Árbol jerárquico con `parent_id` (categorías anidadas)
- CRUD: crear, editar, inactivar (no borrar)

### Productos
- Campos: nombre, categoría, marca, unidad de medida, tipo, es_perecedero, dias_alerta, activo
- **Inactivación** — no se borran, se ocultan. Registro histórico intacto, reactivables
- **Duplicar producto** — agilizar registro de similares
- Filtros: categoría, marca, estado activo/inactivo, nombre

### Unidades de medida
- Soporte de múltiples unidades: unidad, caja, paquete, pieza, kg, litro, etc.
- **Factor de conversión**: caja de 6 = 6 unidades (precio sugerido automático pero editable)

### Precios
- Precio de venta + costo promedio por producto
- Actualización de precio de venta si varió el costo de compra (módulo purchases lo dispara)

### Atributos flex (por rubro)
```sql
producto_atributos (tenant_id, producto_id, clave, valor)
```
Ejemplos por rubro:
- Ropa/calzado: `talla=XL`, `color=rojo`
- Autopartes: `codigo_oem=B2345`
- Farmacia/alimentos: `fecha_venc=2025-12-01`

### Stock mínimo y máximo
- Alertas automáticas cuando stock baja del mínimo o supera el máximo
- Configurables por producto (módulo inventory los usa)

## Tablas involucradas

```sql
categorias          -- tenant_id, id, nombre, parent_id
productos           -- tenant_id, id, nombre, tipo, categoria_id, unidad_medida, es_perecedero, dias_alerta, activo
producto_atributos  -- tenant_id, producto_id, clave, valor
producto_precios    -- tenant_id, producto_id, precio_venta, costo_promedio
```

## Endpoints esperados

```
GET    /products              lista con filtros (categoría, marca, estado, nombre)
POST   /products              crear producto
GET    /products/:id          detalle
PATCH  /products/:id          editar
DELETE /products/:id          inactivar (soft delete)
POST   /products/:id/duplicate duplicar

GET    /categories            árbol de categorías
POST   /categories            crear categoría
PATCH  /categories/:id        editar
DELETE /categories/:id        inactivar
```
