# QoriERP
## Sistema de Gestión Empresarial Multitenant
### Documento de Contexto y Visión del Producto
> Para uso en Claude Code — base para PRD y SDD

---

## 1. Visión del Producto

Desarrollar un sistema de gestión empresarial **multitenant y comercial** construido con **Tauri 2 + React** (cliente desktop) y **Node.js + Fastify + PostgreSQL** (backend en servidor), orientado a pequeños y medianos negocios de Bolivia y Latinoamérica. El sistema requiere conexión a internet y se distribuye bajo dos modelos de despliegue:

- **Modo SaaS**: el proveedor hostea el backend, los clientes pagan suscripción mensual.
- **Modo Self-hosted**: el cliente compra una licencia e instala el backend en su propio VPS. El código es idéntico; cambia solo la configuración.

El cliente Tauri es **agnóstico al backend**: apunta a una URL de API configurable, sin importar si es el servidor SaaS del proveedor o la instancia propia del cliente.

**Competidor de referencia analizado:**
Sistema SaaS de inventario para licorerias que opera bajo subdominio por 220 Bs/mes. El objetivo es superar su funcionalidad siendo multi-rubro, con modelo de negocio flexible (SaaS o licencia), gestión de recetas/producción.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Rol |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | UI moderna, componentes reutilizables |
| Desktop shell | Tauri 2 | App nativa Windows/macOS/Linux, acceso a hardware |
| API | Node.js + Fastify + TypeScript | REST API, lógica de negocio, valuación, explosión BOM |
| ORM | Prisma | Migraciones versionadas, type-safety, acceso a BD |
| Base de datos | PostgreSQL + Row-Level Security | Multitenancy nativo, ACID, integridad referencial |
| Auth | JWT con `tenant_id` embebido | Aislamiento de tenants a nivel de token y BD |
| Reportes | Desde frontend | Exportación a Excel y PDF |
| Impresión | Tauri nativo (ESC/POS) | Tickets directos a impresora térmica, sin PDF intermedio |
| WhatsApp | API oficial Business | Sin QR que se desconecta |
| CI/CD | GitHub Actions | Build y distribución de updates del cliente Tauri |

### Modelo de despliegue

```
┌─────────────────────────────────────────────────────┐
│  Cliente Tauri (Windows/macOS/Linux)                │
│  Apunta a API_BASE_URL configurable                 │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐   ┌──────────▼────────────┐
│  SaaS (proveedor)│   │  Self-hosted (cliente) │
│  api.sabisoft.com│   │  api.miempresa.com     │
│  N tenants       │   │  1 tenant              │
└───────┬──────────┘   └──────────┬─────────────┘
        │                         │
┌───────▼─────────────────────────▼─────────────┐
│  Node.js + Fastify + Prisma + PostgreSQL (RLS) │
└────────────────────────────────────────────────┘
```

### Variables de entorno por modo

```env
# Modo SaaS
DEPLOYMENT_MODE=saas
ALLOW_REGISTRATION=true

# Modo Self-hosted
DEPLOYMENT_MODE=self-hosted
ALLOW_REGISTRATION=false
# TENANT_ID ya no es necesario — el sistema resuelve el tenant único desde BD
```

### Arquitectura interna del backend

El backend sigue **Clean Architecture + CQRS ligero**:

```
apps/api/src/
├── domain/          ← entidades + interfaces de repositorios (sin Prisma, sin Fastify)
├── application/
│   ├── commands/    ← escrituras: CreateProduct, RegisterSale, TransferStock
│   └── queries/     ← lecturas:  GetInventory, GetSaleReport
├── infrastructure/  ← Prisma, Fastify routes, EventBus, WebSockets
└── shared/          ← errores, tipos, utils
```

**Regla de oro**: `domain` no importa nada externo. `application` solo importa `domain`. `infrastructure` implementa las interfaces del `domain`.

Los Commands y Queries son operaciones discretas y tipadas — base para exponer capacidades del sistema a agentes IA (MCP) en el futuro sin tocar el dominio.

---

## 3. Arquitectura Multitenant y Multi-rubro

### Multitenancy

El sistema usa **una sola instancia de PostgreSQL** con aislamiento por **Row-Level Security (RLS)**. Cada fila en todas las tablas lleva un `tenant_id` (UUID). Las políticas RLS de PostgreSQL garantizan que una sesión autenticada solo puede leer y escribir sus propios datos — el aislamiento ocurre a nivel de base de datos, no solo a nivel de aplicación.

```sql
-- Ejemplo de política RLS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON productos
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

En **modo self-hosted**, el `tenant_id` es siempre el mismo (el del negocio instalado). El mecanismo es idéntico.

### Multi-rubro

La diferencia entre rubros NO se maneja con tablas separadas, sino con:

### Rubros contemplados

- Licorera / Minimarket
- Ferretería / Materiales de construcción
- Autopartes
- Farmacia (requiere control de vencimientos estricto)
- Ropa / Calzado (requiere talla, color, talle)
- Restaurante / Pizzería / Comida (requiere módulo de producción y recetas)
- Supermercado
- Otros (configuración libre)

### Tabla de atributos flexibles

En vez de columnas fijas por rubro, se usa una tabla clave-valor:

```sql
producto_atributos (producto_id, clave, valor)
-- Ejemplos:
-- 'talla'         = 'XL'
-- 'color'         = 'rojo'
-- 'codigo_oem'    = 'B2345'
-- 'fecha_venc'    = '2025-12-01'
```

---

## 4. Módulos del Sistema

### 4.1 Inventario y Productos

- CRUD de productos con nombre, categoría, marca, unidad de medida, ubicación física
- Soporte de múltiples unidades: unidad, caja, paquete, pieza, kg, litro, etc.
- Paquetes con factor de conversión (ej: caja de 6 = 6 unidades, precio sugerido automático pero editable)
- Imágenes de producto (opcional)
- Inactivación de productos — no se borran, se ocultan; registro histórico intacto, reactivables
- Ajustes de inventario **positivos** (bonificaciones de proveedor) y **negativos** (merma, vencido, pérdida) con motivo obligatorio
- Carga de inventario inicial: stock masivo desde cero tras conteo físico
- Stock mínimo y máximo con alertas automáticas
- Filtros avanzados: categoría, marca, estado activo/inactivo, nombre
- Atributos custom por rubro (talla/color para ropa, código OEM para autopartes, vencimiento para farmacia/alimentos)
- Opción de duplicar producto para agilizar registro de similares

### 4.2 Compras

- Gestión de proveedores con NIT o CI
- Registro de compras con selección de productos y cantidades
- **Moneda de compra configurable** (`BOB`, `USD`, `ARS`, `BRL`, etc.) con tipo de cambio al momento de la operación
- Precio unitario almacenado en moneda origen **y** en BOB (calculado automáticamente)
- Tipo de cambio pre-rellenado desde la última tasa registrada, editable antes de confirmar
- Actualización de precio de venta si varió el costo de compra
- Métodos de pago: efectivo, tarjeta, transferencia, pago posterior (crédito) — ver módulo Pagos
- Cuentas por pagar: registro de deuda con pagos parciales o totales posteriores
- Impacto automático en caja al pagar en efectivo
- Generación de lotes al ingresar mercadería (requerido para PEPS y control de vencimientos)

### 4.3 Ventas / POS

- Venta a cliente genérico ("Control Tributario") o cliente registrado
- Interfaz **modo lista** y **modo menú visual** con imágenes (tipo POS táctil)
- Compatibilidad con lectores de código de barras USB/HID
- Escaneo por cámara del dispositivo (sin lector físico externo) — ventaja sobre sistema de referencia
- Descuentos por ítem o sobre el total de la venta
- Pagos combinados: efectivo + transferencia + QR en una sola transacción
- Generación de nota de entrega / comprobante
- Envío de comprobante por WhatsApp al cliente
- Impresión directa en impresora térmica

### 4.4 Cotizaciones

- Presupuestos con fecha límite de validez configurable
- Conversión de cotización a venta con un clic
- Edición de cantidades finales al confirmar

### 4.5 Caja

- Apertura obligatoria con monto base (fondo para dar cambio)
- Registro de movimientos extra: ingresos y salidas ajenos a ventas/compras (pasajes, almuerzos, limpieza, etc.)
- Cierre con arqueo: **saldo calculado** por sistema vs **saldo físico** contado por el cajero
- Diferencias (sobrante o faltante) requieren justificación obligatoria antes de poder cerrar

### 4.6 Reportes

- Existencias actuales
- Kardex por producto (historial completo de movimientos: compras, ventas, ajustes)
- Vencimientos próximos (configurable: X días de anticipación)
- Ventas: general, detallado, mensual
- Compras: general y detallado
- Utilidad bruta (ganancia real descontando costos de compra por lote)
- CxC: aging report por cliente (quién debe, hace cuánto, estado)
- CxP: aging report por proveedor
- Exportación a Excel y PDF
- Dashboard con gráficos en tiempo real — mejora sobre sistema de referencia

### 4.7 Usuarios y Roles

- **Administrador**: acceso total
- **Cajero**: permisos restringidos configurables — se puede ocultar reportes de ganancias, edición de precios, gestión de proveedores, etc.
- Creación de usuarios con nombre, usuario y contraseña
- Cada usuario se asigna a una o varias sucursales

---

### 4.8 Pagos (entidad separada)

Los pagos son una **entidad de primera clase**, no un campo embebido dentro de ventas o compras. Esto resuelve de forma unificada: pagos combinados en POS, cuotas de CxP, abonos de CxC, y el historial completo de caja.

```
venta ──→ pago (efectivo, 50 Bs, sesión caja actual)
      └──→ pago (QR,      70 Bs, sesión caja actual)

compra_credito ──→ pago (adelanto,  30%, hoy)
               └──→ pago (saldo,    70%, en 15 días)  ← genera CxP
```

Cada pago referencia:
- La entidad origen: `venta_id` | `compra_id` | `devolucion_id`
- El método: `efectivo` | `tarjeta` | `transferencia` | `qr` | `credito`
- La sesión de caja activa (para impacto automático en arqueo)
- El usuario que registró el pago

```sql
pagos  -- tenant_id, id, entidad_tipo, entidad_id, sucursal_id,
       --   sesion_caja_id, metodo, monto, referencia_externa,
       --   usuario_id, fecha, notas
```

> Las tablas `ventas` y `compras` ya no llevan `metodo_pago`. El estado de pago (`pagado` | `parcial` | `pendiente`) se calcula sumando los pagos asociados.

---

### 4.9 Cuentas por Cobrar (CxC)

Espejo de la CxP pero hacia los clientes. Cuando una venta se registra con método `credito`, se genera automáticamente una cuenta por cobrar.

- Seguimiento de deuda por cliente con saldo pendiente en tiempo real
- Pagos parciales: el cliente abona en cuotas, cada pago reduce el saldo
- Estado automático: `al_dia` | `por_vencer` | `vencido` (configurable por días)
- Aging report: agrupa deudas por antigüedad (0-30d, 31-60d, 61-90d, +90d)
- Alerta automática cuando una CxC entra en estado `vencido`
- Bloqueo opcional: el sistema puede impedir nuevas ventas a crédito a clientes con CxC vencidas (configurable por el admin)

```sql
cuentas_cobrar  -- tenant_id, id, venta_id, cliente_id, sucursal_id,
                --   monto_total, monto_cobrado, fecha_vencimiento, estado
```

Los pagos de CxC se registran en la tabla `pagos` con `entidad_tipo = 'cxc'`.

---

### 4.10 Tipos de Cambio

Registro histórico de tasas de cambio por moneda. Permite trazar la variación cambiaria y pre-rellenar automáticamente el tipo de cambio al crear compras y pedidos.

- El admin registra la tasa vigente cuando la actualiza (no hay fetch automático de APIs externas)
- Soporta múltiples tipos por moneda: `oficial`, `paralelo`, `personalizado`
- Al crear una compra o pedido en moneda extranjera, el sistema pre-rellena con la **última tasa registrada** para esa moneda — editable antes de confirmar
- Reportes pueden mostrar el costo de compras normalizados a USD para comparación histórica entre períodos con distinta tasa

```sql
tipos_cambio  -- tenant_id, id, moneda ('USD'|'ARS'|'BRL'|...), tasa,
              --   tipo ('oficial'|'paralelo'|'personalizado'),
              --   fecha, usuario_id, notas
```

---

### 4.11 Anulaciones

Las anulaciones nunca borran registros. Toda transacción anulable tiene un estado `ANULADA` y genera un registro de auditoría. Aplica a: **ventas, compras, transferencias, pedidos, cotizaciones**.

#### Reglas por entidad

| Entidad | Reversión de stock | Reversión de caja | Quién puede anular |
|---|---|---|---|
| Venta | Stock vuelve a sucursal | Egreso en caja si fue efectivo | Admin (cajero con permiso) |
| Compra | Lotes eliminados o ajustados | Ingreso en caja si fue efectivo | Admin |
| Transferencia | Stock vuelve a origen | No aplica | Admin |
| Pedido | Sin impacto (no hubo movimiento) | No aplica | Admin o solicitante |
| Cotización | Sin impacto | No aplica | Admin o vendedor |

#### Restricciones

- Una venta **no se puede anular** si la sesión de caja ya está cerrada (requiere admin con permiso especial)
- Una compra **no se puede anular** si algún lote generado ya fue consumido parcialmente en ventas
- Toda anulación requiere **motivo obligatorio**
- Se registra: quién anuló, cuándo, desde qué sucursal, y el motivo

```sql
anulaciones  -- tenant_id, id, entidad_tipo, entidad_id, usuario_id,
             --   sucursal_id, motivo, fecha, detalles_reversion (jsonb)
```

---

### 4.12 Sucursales y Transferencias de Stock

#### Concepto

Cada tenant puede tener múltiples sucursales. Una sucursal se marca como **central** (`es_central = true`) y actúa como almacén principal que abastece a las demás. El stock es **independiente por sucursal**: cada una tiene su propio inventario, su propia caja y sus propias operaciones de compra/venta.

Las transferencias entre sucursales cualesquiera (incluyendo central → sucursal y sucursal → sucursal) usan el mismo mecanismo.

#### Impacto en el esquema existente

Los siguientes objetos pasan a tener `sucursal_id`:

| Tabla | Por qué |
|---|---|
| `lotes` | El stock físico está en una sucursal específica |
| `ventas` | Una venta ocurre en una sucursal |
| `compras` | Una compra ingresa mercadería a una sucursal |
| `caja_sesiones` | Cada sucursal tiene su propia caja |
| `usuarios` | Un usuario opera en una o varias sucursales |
| `ajustes_inventario` | El ajuste afecta stock de una sucursal |

#### Workflow de transferencia

```
SOLICITADA → APROBADA → EN_TRANSITO → RECIBIDA
                  ↓
             RECHAZADA
```

1. **SOLICITADA**: sucursal destino (o el admin) crea la solicitud indicando origen, destino y productos con cantidades.
2. **APROBADA**: sucursal origen revisa y aprueba. El stock origen queda reservado (no disponible para venta).
3. **EN_TRANSITO**: origen confirma el despacho. Stock sale de la sucursal origen.
4. **RECIBIDA**: destino confirma recepción con cantidades reales recibidas. Stock entra en sucursal destino. Si hay diferencia entre lo despachado y lo recibido, se registra como discrepancia con motivo obligatorio.
5. **RECHAZADA**: origen rechaza la solicitud con motivo. Sin impacto en stock.

#### Nuevas tablas

```sql
sucursales              -- tenant_id, id, nombre, direccion, telefono, es_central, activo
transferencias          -- tenant_id, id, sucursal_origen_id, sucursal_destino_id,
                        --   estado, fecha_solicitud, fecha_despacho, fecha_recepcion,
                        --   solicitante_id, despachador_id, receptor_id, notas
transferencia_items     -- transferencia_id, producto_id, cantidad_solicitada,
                        --   cantidad_despachada, cantidad_recibida, lote_id
```

#### Reportes por sucursal

- Stock actual por sucursal (comparativo entre sucursales)
- Historial de transferencias (origen/destino, fechas, discrepancias)
- Ventas y compras segmentadas por sucursal
- Kardex por producto filtrable por sucursal

---

### 4.13 Chat Interno

> **Módulo diferido a Fase 3.** La infraestructura de sucursales debe estar estable antes de implementar esto.

Canal de comunicación interna entre usuarios de distintas sucursales del mismo tenant. Funcionalidades previstas:

- Mensajes en tiempo real por WebSockets (Fastify WS plugin)
- Canales por sucursal + mensajes directos entre usuarios
- **Solicitud de reposición integrada**: desde el chat se puede generar una transferencia (pre-completa el formulario con los productos mencionados)
- Notificaciones de cambios de estado en transferencias activas
- Historial de conversaciones persistido en BD

```sql
chat_mensajes           -- tenant_id, id, remitente_id, sucursal_destino_id,
                        --   contenido, tipo ('texto'|'solicitud_transferencia'),
                        --   referencia_id, leido, created_at
```

---

### 4.14 Pedidos a Proveedores (Órdenes de Compra)

Permite generar una orden formal a un proveedor antes de que la mercadería llegue. Cuando llega, el pedido se convierte en una compra con un clic — sin re-ingresar datos.

#### Workflow

```
BORRADOR → ENVIADO → EN_TRANSITO → PARCIALMENTE_RECIBIDO → COMPLETADO
               ↓           ↓                  ↓
           CANCELADO   CANCELADO          CANCELADO
```

- **BORRADOR**: pedido en preparación, editable. Se puede registrar moneda y tipo de cambio estimado.
- **ENVIADO**: se confirmó al proveedor. Registra fecha esperada de entrega.
- **EN_TRANSITO**: proveedor confirmó el despacho. Se puede registrar número de guía/tracking y transportista. Fecha estimada de llegada actualizable.
- **PARCIALMENTE_RECIBIDO**: llegaron algunos ítems. Se registra la recepción con el tipo de cambio real del día (puede diferir del estimado). El pedido sigue abierto para el resto.
- **COMPLETADO**: todos los ítems recibidos. Se genera la `compra` automáticamente con los lotes y el tipo de cambio de recepción.
- **CANCELADO**: con motivo obligatorio en cualquier estado previo a COMPLETADO. Sin impacto en stock.

#### Recepción parcial

Cada ítem lleva `cantidad_pedida` y `cantidad_recibida`. En cada recepción se actualiza `cantidad_recibida` y se registra el tipo de cambio vigente en ese momento. Al completarse, la compra generada usa el tipo de cambio de la última recepción (o el promedio ponderado si hubo múltiples recepciones a distintas tasas).

#### Tipo de cambio en pedidos

El pedido registra dos tasas:
- `tipo_cambio_estimado`: al momento de crear el pedido
- `tipo_cambio_recepcion`: al momento de recibir la mercadería (el que impacta en el costo real del lote)

Esto permite comparar el costo estimado vs el costo real para análisis de variación cambiaria.

#### Nuevas tablas

```sql
pedidos                 -- tenant_id, id, sucursal_id, proveedor_id, fecha_pedido,
                        --   fecha_esperada, fecha_llegada_estimada, tracking, transportista,
                        --   estado, notas, compra_id,
                        --   moneda, tipo_cambio_estimado, tipo_cambio_recepcion
pedido_items            -- tenant_id, pedido_id, producto_id,
                        --   cantidad_pedida, cantidad_recibida,
                        --   precio_unitario_origen, precio_unitario_bob_estimado
```

---

### 4.15 Devoluciones de Clientes

Gestiona el retorno de productos vendidos. El caso principal es el **cambio de producto** (el cliente devuelve X y lleva Y), pero también cubre reembolsos simples.

#### Tipos de devolución

| Tipo | Descripción |
|---|---|
| **Cambio** | El cliente devuelve uno o más productos y lleva otros. Puede haber diferencia de precio a favor o en contra. |
| **Reembolso** | Se devuelve dinero al cliente. Impacta en caja. |

#### Condición del producto devuelto

Determina qué pasa con el stock:

| Condición | Impacto |
|---|---|
| `resaleable` | Vuelve al inventario de la sucursal (genera lote de reingreso) |
| `dañado` | Se registra como ajuste negativo con motivo "devolución dañada" |
| `vencido` | Igual que dañado |

#### Flujo de cambio con diferencia de precio

```
Devuelve: Producto A  →  valor 50 Bs
Lleva:    Producto B  →  valor 70 Bs
Diferencia: cliente paga 20 Bs adicionales
```

Si el nuevo producto es más barato, se emite una nota de crédito o se devuelve el excedente en efectivo.

#### Relación con la venta original

Toda devolución debe referenciar la venta original. Si no tiene comprobante, el sistema permite registrarla igualmente con motivo justificado (configurable por el administrador).

#### Nuevas tablas

```sql
devoluciones            -- tenant_id, id, sucursal_id, venta_id (nullable), cliente_id,
                        --   fecha, tipo ('cambio'|'reembolso'), motivo, estado, usuario_id
devolucion_items        -- tenant_id, devolucion_id, producto_id, cantidad,
                        --   condicion ('resaleable'|'dañado'|'vencido'), lote_id
devolucion_cambios      -- tenant_id, devolucion_id, producto_id, cantidad,
                        --   precio_unitario  -- productos entregados al cliente en el cambio
```

---

## 5. Módulo de Producción y Recetas (BOM)

> **Este módulo se activa únicamente para negocios tipo restaurante, pizzería, panadería, manufactura. No aparece en negocios de reventa simple.**

### 5.1 Tipos de ítem

| Tipo | Descripción | Ejemplo |
|---|---|---|
| Producto final | Se vende al público, tiene receta | Pizza Napolitana |
| Sub-producto | Se produce internamente, no se vende solo | Masa base, Salsa de tomate |
| Insumo directo | Se compra y se consume en producción | Harina, Queso, Tomate |
| Perecedero | Cualquier tipo con fecha de vencimiento obligatoria y alerta | Tomate, Queso, Jamón |
| No perecedero | Sin vencimiento | Sal, Orégano seco |

### 5.2 Estructura de receta (BOM recursivo)

La tabla de recetas es **autorreferencial**, permitiendo profundidad infinita de componentes:

```sql
receta_items (
  id,
  producto_padre_id,   -- ej: Pizza Napolitana
  producto_hijo_id,    -- ej: Masa base
  cantidad,
  unidad_medida
)
```

**Ejemplo de explosión para "Pizza Napolitana":**

```
Pizza Napolitana (producto final)
├── Masa base (sub-producto)
│   ├── Harina          500g
│   ├── Levadura         10g
│   └── Agua            300ml
├── Salsa de tomate (sub-producto)
│   ├── Tomate          200g
│   └── Orégano           5g
├── Queso mozzarella    150g  (insumo directo)
└── Jamón                80g  (insumo directo)
```

### 5.3 Explosión de BOM al vender

Cuando se registra una venta de un producto con receta, el sistema automáticamente:

1. Recorre todos los niveles de la receta (explosión completa)
2. Descuenta del stock cada insumo en la cantidad correspondiente
3. Aplica el método de valuación configurado (PEPS por defecto para perecederos) al lote consumido
4. Registra el movimiento en el Kardex de cada insumo

> **Caso borde importante:** El sistema debe detectar y rechazar referencias circulares en recetas (producto A contiene B que contiene A).

---

## 6. Métodos de Valuación de Inventario

Se configura **una sola vez** al crear el negocio. No cambia la estructura de la base de datos; solo cambia el algoritmo aplicado al calcular costos en reportes de utilidad y al descontar lotes.

| Método | Descripción | Cuándo usar |
|---|---|---|
| **PEPS (FIFO)** | Primera entrada, primera salida. El lote más antiguo se consume primero. | Obligatorio para perecederos |
| **UEPS (LIFO)** | Última entrada, primera salida. | Contextos inflacionarios. No recomendado para perecederos |
| **CPP** | Costo Promedio Ponderado. Promedia el costo de todos los lotes disponibles. | El más simple y común en reventa |

### Estructura de lotes (necesaria para PEPS/UEPS)

```sql
lotes (
  id,
  producto_id,
  cantidad,
  costo_unitario,
  fecha_vencimiento,   -- NULL si no es perecedero
  fecha_ingreso,
  proveedor_id
)
```

Cada compra genera un lote. Al vender, el sistema selecciona el lote según el método configurado y descuenta la cantidad correspondiente.

---

## 7. Esquema de Base de Datos (Referencia preliminar)

> **Este esquema es una referencia de diseño, NO el esquema definitivo.** Las columnas, tipos, índices, restricciones y relaciones exactas se definirán durante el PRD/SDD. Su propósito es documentar las entidades y sus relaciones conceptuales para guiar las decisiones de arquitectura.

Todas las tablas de negocio incluyen `tenant_id UUID NOT NULL` con política RLS activa.

### Tablas de plataforma (sin RLS — globales)

```sql
tenants                 -- id (UUID), nombre, plan, deployment_mode, activo, created_at
```

### Tablas de negocio (todas con tenant_id + RLS)

```sql
-- Configuración y estructura
configuracion           -- tenant_id, tipo_negocio, moneda, metodo_valuacion, modulos_activos
sucursales              -- tenant_id, id, nombre, direccion, telefono, es_central, activo
categorias              -- tenant_id, id, nombre, parent_id (categorías anidadas)

-- Maestros
proveedores             -- tenant_id, id, nombre, nit_ci, telefono, email
clientes                -- tenant_id, id, nombre, nit_ci, telefono, whatsapp
productos               -- tenant_id, id, nombre, tipo, categoria_id, unidad_medida, es_perecedero, dias_alerta, activo
producto_atributos      -- tenant_id, producto_id, clave, valor
producto_precios        -- tenant_id, producto_id, precio_venta, costo_promedio

-- Inventario (stock por sucursal)
lotes                   -- tenant_id, id, sucursal_id, producto_id, cantidad, costo_unitario, fecha_vencimiento, fecha_ingreso
receta_items            -- tenant_id, id, producto_padre_id, producto_hijo_id, cantidad, unidad_medida
ajustes_inventario      -- tenant_id, id, sucursal_id, producto_id, tipo, cantidad, motivo, fecha

-- Transferencias entre sucursales
transferencias          -- tenant_id, id, sucursal_origen_id, sucursal_destino_id, estado,
                        --   fecha_solicitud, fecha_despacho, fecha_recepcion,
                        --   solicitante_id, despachador_id, receptor_id, notas
transferencia_items     -- tenant_id, transferencia_id, producto_id, lote_id,
                        --   cantidad_solicitada, cantidad_despachada, cantidad_recibida

-- Pagos (entidad separada — aplica a ventas, compras, CxC, CxP, devoluciones)
pagos                   -- tenant_id, id, entidad_tipo ('venta'|'compra'|'cxc'|'cxp'|'devolucion'),
                        --   entidad_id, sucursal_id, sesion_caja_id, metodo
                        --   ('efectivo'|'tarjeta'|'transferencia'|'qr'|'credito'),
                        --   monto, referencia_externa, usuario_id, fecha, notas

-- Tipos de cambio histórico
tipos_cambio            -- tenant_id, id, moneda, tasa, tipo ('oficial'|'paralelo'|'personalizado'),
                        --   fecha, usuario_id, notas

-- Compras y cuentas por pagar
compras                 -- tenant_id, id, sucursal_id, proveedor_id, fecha, total_bob, estado,
                        --   moneda, tipo_cambio
                        --   (sin metodo_pago — ver tabla pagos)
compra_items            -- tenant_id, compra_id, producto_id, lote_id, cantidad,
                        --   costo_unitario_origen, costo_unitario_bob
cuentas_pagar           -- tenant_id, id, compra_id, monto_total, monto_cobrado, fecha_vencimiento, estado

-- Ventas y cuentas por cobrar
ventas                  -- tenant_id, id, sucursal_id, cliente_id, fecha, total, estado
                        --   (sin metodo_pago — ver tabla pagos)
venta_items             -- tenant_id, venta_id, producto_id, cantidad, precio_unitario, descuento
cotizaciones            -- tenant_id, id, sucursal_id, cliente_id, fecha, fecha_vencimiento, total, convertida
cuentas_cobrar          -- tenant_id, id, venta_id, cliente_id, sucursal_id,
                        --   monto_total, monto_cobrado, fecha_vencimiento, estado

-- Caja (por sucursal)
caja_sesiones           -- tenant_id, id, sucursal_id, monto_apertura, monto_cierre, fecha_apertura, fecha_cierre
caja_movimientos        -- tenant_id, id, sesion_id, tipo, monto, descripcion, referencia_id

-- Anulaciones (auditoría de reversiones)
anulaciones             -- tenant_id, id, entidad_tipo, entidad_id, usuario_id,
                        --   sucursal_id, motivo, fecha, detalles_reversion (jsonb)

-- Usuarios y permisos
usuarios                -- tenant_id, id, nombre, usuario, hash_password, rol
usuarios_sucursales     -- tenant_id, usuario_id, sucursal_id  (relación N:M)
roles_permisos          -- tenant_id, rol, modulo, puede_ver, puede_editar

-- Pedidos a proveedores
pedidos                 -- tenant_id, id, sucursal_id, proveedor_id, fecha_pedido,
                        --   fecha_esperada, estado, notas, compra_id
pedido_items            -- tenant_id, pedido_id, producto_id,
                        --   cantidad_pedida, cantidad_recibida, precio_unitario_estimado

-- Devoluciones de clientes
devoluciones            -- tenant_id, id, sucursal_id, venta_id, cliente_id,
                        --   fecha, tipo ('cambio'|'reembolso'), motivo, estado, usuario_id
devolucion_items        -- tenant_id, devolucion_id, producto_id, cantidad,
                        --   condicion ('resaleable'|'dañado'|'vencido'), lote_id
devolucion_cambios      -- tenant_id, devolucion_id, producto_id, cantidad, precio_unitario

-- Chat interno (Fase 3)
chat_mensajes           -- tenant_id, id, remitente_id, sucursal_destino_id,
                        --   contenido, tipo ('texto'|'solicitud_transferencia'),
                        --   referencia_id, leido, created_at
```

### Flujo de autenticación multitenant

El cliente Tauri llama `GET /api/info` al arrancar para saber qué modo mostrar:

```
GET /api/info  ← público, sin auth
→ { version, mode: 'saas'|'self-hosted', setupRequired: boolean }
```

**Modo SaaS** — múltiples tenants, registro público habilitado:

```
POST /auth/register { tenantName, slug, adminUsername, adminPassword }
POST /auth/login    { username, password, tenantSlug }  ← tenantSlug requerido
```

**Modo Self-hosted** — un solo tenant, registro deshabilitado:

```
POST /setup      { businessName, adminUsername, adminPassword }
  → Solo funciona si DEPLOYMENT_MODE=self-hosted Y no existe ningún tenant
  → slug se auto-genera desde businessName
  → Retorna 409 si ya hay un tenant (idempotente)

POST /auth/login { username, password }  ← tenantSlug omitido
  → El backend resuelve el único tenant desde BD
```

**RLS — idéntico en ambos modos:**

```
Cada request autenticado:
  → extrae tenant_id del JWT
  → SET LOCAL app.tenant_id = 'uuid'  (antes de cada query)
  → PostgreSQL RLS filtra automáticamente
```

> Spec técnico detallado en engram: `sdd/decisions/self-hosted-auth`

---

## 8. Ventajas sobre Sistema de Referencia

| Característica | Sistema de referencia | QoriERP |
|---|---|---|
| Modelo de negocio | Solo SaaS, 220 Bs/mes | SaaS o licencia self-hosted |
| Rubros | Exclusivo para licorerias | Multi-rubro configurable |
| Impresión | PDF intermedio | Térmica directa via Tauri |
| Código de barras | Lector físico externo | También por cámara del dispositivo |
| WhatsApp | QR que se desconecta | API Business oficial estable |
| Producción | No tiene | Módulo BOM con recetas recursivas |
| Valuación | No documentado | PEPS, UEPS y CPP configurables |
| Analytics | Tablas exportables | Dashboard con gráficos en tiempo real |
| Atributos | Campos fijos | Flexibles por rubro (talla, OEM, venc.) |
| Infraestructura cliente | Bloqueado al SaaS del proveedor | Puede instalar en su propio VPS |

---

## 9. Orden de Desarrollo Sugerido

### Fase 0 — Infraestructura base

1. Repositorio monorepo: `/apps/api`, `/apps/desktop`, `/packages/shared`
2. Setup PostgreSQL + Prisma + migraciones versionadas
3. Tabla `tenants` + RLS habilitado en todas las tablas de negocio
4. Auth: registro de tenant, login, JWT con `tenant_id`
5. Middleware Fastify: extrae `tenant_id` del JWT y ejecuta `SET LOCAL app.tenant_id`
6. Pipeline GitHub Actions: build Tauri + distribución de updates

### Fase 1 — Backend core (Node.js + Fastify)

1. CRUD de sucursales (incluyendo marca de sucursal central)
2. CRUD de productos, categorías, proveedores, clientes (con tenant_id + sucursal_id donde aplica)
3. Sistema de lotes por sucursal
4. Lógica de valuación: PEPS, UEPS, CPP (con tests unitarios en Vitest)
5. Módulo de compras con impacto en lotes por sucursal
6. Módulo de ventas con descuento de stock por sucursal
7. Explosión de BOM para ventas con receta (con detección de ciclos)
8. Caja por sucursal: apertura, movimientos, cierre/arqueo
9. **Transferencias entre sucursales**: workflow completo (SOLICITADA → RECIBIDA), reserva de stock, discrepancias
10. **Pagos como entidad separada**: tabla `pagos` con soporte multi-método y referencia polimórfica
11. **CxC**: ventas a crédito, abonos parciales, aging report, bloqueo configurable
12. **Anulaciones**: reversión de stock, reversión de caja, auditoría con motivo obligatorio
13. **Pedidos a proveedores**: workflow completo, recepción parcial, conversión a compra
14. **Devoluciones de clientes**: cambio con diferencia de precio, reembolso, reingreso de stock por condición
15. Reportes: Kardex, utilidad bruta, vencimientos, CxC/CxP aging — todos filtrables por sucursal
16. Roles y permisos por tenant + asignación de usuarios a sucursales

### Fase 2 — Frontend (React + Tauri)

1. Pantalla de configuración de API URL (apunta al backend)
2. Login con resolución de tenant
3. Layout principal con navegación por módulos
4. Pantallas de inventario y productos
5. POS / pantalla de ventas (modo lista y modo visual)
6. Pantallas de compras
7. Gestión de caja
8. Constructor de recetas (árbol BOM visual)
9. Dashboard con gráficos
10. Reportes con preview y exportación

### Fase 3 — Hardware e Integraciones

1. Impresora térmica (ESC/POS via Tauri plugin)
2. Lector de códigos de barras por cámara
3. WhatsApp Business API
4. Panel de administración de tenants (modo SaaS)

---

## 10. Notas para el PRD y SDD

> El SDD debe comenzar por el esquema completo de la BD con restricciones, índices, relaciones y políticas RLS **antes** de tocar código Node.js o React.

- El PRD debe incluir casos de uso por rol: **Administrador** vs **Cajero**, y por modo: **SaaS** vs **Self-hosted**
- El SDD de backend debe documentar cada endpoint Fastify con sus tipos de entrada/salida en TypeScript
- Implementar migraciones de BD desde el inicio con **Prisma Migrate** (versionado en git)
- Los métodos de valuación (PEPS, UEPS, CPP) deben estar cubiertos por **tests unitarios en Vitest**
- La explosión de BOM debe manejar y rechazar referencias circulares
- RLS debe ser validado con tests de integración que verifiquen que tenant A no puede acceder a datos de tenant B
- Soporte multi-moneda es deseable pero puede diferirse a Fase 2
- Considerar internacionalización (i18n) desde el inicio si se apunta a Latinoamérica
- Estrategia de backup: en SaaS el proveedor gestiona backups de PostgreSQL; en self-hosted documentar procedimiento de `pg_dump`

---

*Documento generado como contexto base para desarrollo con Claude Code.*
