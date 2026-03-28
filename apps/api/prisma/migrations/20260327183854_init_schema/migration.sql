-- CreateEnum
CREATE TYPE "DeploymentMode" AS ENUM ('saas', 'self_hosted');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'starter', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "TipoNegocio" AS ENUM ('licorera_minimarket', 'ferreteria', 'autopartes', 'farmacia', 'ropa_calzado', 'restaurante', 'supermercado', 'otro');

-- CreateEnum
CREATE TYPE "MetodoValuacion" AS ENUM ('PEPS', 'UEPS', 'CPP');

-- CreateEnum
CREATE TYPE "TipoProducto" AS ENUM ('producto_final', 'sub_producto', 'insumo_directo', 'reventa');

-- CreateEnum
CREATE TYPE "UnidadMedida" AS ENUM ('unidad', 'caja', 'paquete', 'pieza', 'kg', 'gr', 'litro', 'ml', 'docena', 'metro', 'otro');

-- CreateEnum
CREATE TYPE "EstadoTransferencia" AS ENUM ('SOLICITADA', 'APROBADA', 'EN_TRANSITO', 'RECIBIDA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('PENDIENTE', 'PAGADA', 'PARCIAL', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('PENDIENTE', 'PAGADA', 'PARCIAL', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('ACTIVA', 'CONVERTIDA', 'VENCIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('BORRADOR', 'ENVIADO', 'EN_TRANSITO', 'PARCIALMENTE_RECIBIDO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'qr', 'credito');

-- CreateEnum
CREATE TYPE "EntidadPago" AS ENUM ('venta', 'compra', 'cxc', 'cxp', 'devolucion');

-- CreateEnum
CREATE TYPE "EstadoCuentaCobrar" AS ENUM ('al_dia', 'por_vencer', 'vencido', 'pagada');

-- CreateEnum
CREATE TYPE "EstadoCuentaPagar" AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida');

-- CreateEnum
CREATE TYPE "TipoAjusteInventario" AS ENUM ('positivo', 'negativo');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('ingreso', 'egreso');

-- CreateEnum
CREATE TYPE "TipoCambio" AS ENUM ('oficial', 'paralelo', 'personalizado');

-- CreateEnum
CREATE TYPE "TipoDevolucion" AS ENUM ('cambio', 'reembolso');

-- CreateEnum
CREATE TYPE "CondicionDevolucion" AS ENUM ('resaleable', 'danado', 'vencido');

-- CreateEnum
CREATE TYPE "EstadoDevolucion" AS ENUM ('PENDIENTE', 'PROCESADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EntidadAnulacion" AS ENUM ('venta', 'compra', 'transferencia', 'pedido', 'cotizacion', 'devolucion');

-- CreateEnum
CREATE TYPE "TipoChatMensaje" AS ENUM ('texto', 'solicitud_transferencia');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('admin', 'cajero');

-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('BOB', 'USD', 'ARS', 'BRL', 'PEN', 'CLP', 'COP', 'EUR');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'starter',
    "deploymentMode" "DeploymentMode" NOT NULL DEFAULT 'saas',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipoNegocio" "TipoNegocio" NOT NULL,
    "moneda_base" "Moneda" NOT NULL DEFAULT 'BOB',
    "metodo_valuacion" "MetodoValuacion" NOT NULL DEFAULT 'CPP',
    "modulos_activos" JSONB NOT NULL DEFAULT '[]',
    "dias_alerta_venc" INTEGER NOT NULL DEFAULT 30,
    "bloquear_cxc_vencida" BOOLEAN NOT NULL DEFAULT false,
    "dias_por_vencer" INTEGER NOT NULL DEFAULT 7,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sucursales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "es_central" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "hash_password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'cajero',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_sucursales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_permisos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "rol" "Rol" NOT NULL,
    "modulo" TEXT NOT NULL,
    "puede_ver" BOOLEAN NOT NULL DEFAULT true,
    "puede_editar" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "parent_id" UUID,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit_ci" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit_ci" TEXT,
    "telefono" TEXT,
    "whatsapp" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoProducto" NOT NULL DEFAULT 'reventa',
    "categoria_id" UUID,
    "marca" TEXT,
    "unidad_medida" "UnidadMedida" NOT NULL DEFAULT 'unidad',
    "factor_conversion" DECIMAL(10,4),
    "codigo_barras" TEXT,
    "es_perecedero" BOOLEAN NOT NULL DEFAULT false,
    "dias_alerta" INTEGER,
    "stock_minimo" DECIMAL(12,4),
    "stock_maximo" DECIMAL(12,4),
    "imagen_url" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_atributos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "producto_atributos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_precios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "precio_venta" DECIMAL(12,2) NOT NULL,
    "costo_promedio" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producto_precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "costo_unitario" DECIMAL(12,4) NOT NULL,
    "moneda_origen" "Moneda" NOT NULL DEFAULT 'BOB',
    "costo_unit_origen" DECIMAL(12,4),
    "fecha_vencimiento" DATE,
    "fecha_ingreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedor_id" UUID,
    "compra_id" UUID,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receta_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "producto_padre_id" UUID NOT NULL,
    "producto_hijo_id" UUID NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "unidad_medida" "UnidadMedida" NOT NULL,

    CONSTRAINT "receta_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustes_inventario" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "tipo" "TipoAjusteInventario" NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "motivo" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,

    CONSTRAINT "ajustes_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_cambio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "tasa" DECIMAL(12,6) NOT NULL,
    "tipo" "TipoCambio" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" UUID NOT NULL,
    "notas" TEXT,

    CONSTRAINT "tipos_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "proveedor_id" UUID NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_bob" DECIMAL(14,2) NOT NULL,
    "moneda" "Moneda" NOT NULL DEFAULT 'BOB',
    "tipo_cambio" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "estado" "EstadoCompra" NOT NULL DEFAULT 'PENDIENTE',
    "pedido_id" UUID,
    "usuario_id" UUID NOT NULL,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "compra_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "lote_id" UUID,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "costo_unit_origen" DECIMAL(12,4) NOT NULL,
    "costo_unit_bob" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "compra_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_pagar" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "compra_id" UUID NOT NULL,
    "monto_total" DECIMAL(14,2) NOT NULL,
    "monto_pagado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fecha_vencimiento" DATE NOT NULL,
    "estado" "EstadoCuentaPagar" NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "cliente_id" UUID,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(14,2) NOT NULL,
    "descuento" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'PENDIENTE',
    "sesion_caja_id" UUID,
    "usuario_id" UUID NOT NULL,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "venta_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costo_unitario" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "venta_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "cliente_id" UUID,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" DATE NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'ACTIVA',
    "venta_id" UUID,
    "usuario_id" UUID NOT NULL,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cotizacion_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "cotizacion_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_cobrar" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "venta_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "monto_total" DECIMAL(14,2) NOT NULL,
    "monto_cobrado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fecha_vencimiento" DATE NOT NULL,
    "estado" "EstadoCuentaCobrar" NOT NULL DEFAULT 'al_dia',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_cobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entidad_tipo" "EntidadPago" NOT NULL,
    "entidad_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "sesion_caja_id" UUID,
    "metodo" "MetodoPago" NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "referencia_externa" TEXT,
    "usuario_id" UUID NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caja_sesiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "monto_apertura" DECIMAL(14,2) NOT NULL,
    "monto_cierre" DECIMAL(14,2),
    "monto_fisico" DECIMAL(14,2),
    "diferencia" DECIMAL(14,2),
    "justificacion" TEXT,
    "fecha_apertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" TIMESTAMP(3),
    "usuario_apertura_id" UUID NOT NULL,
    "usuario_cierre_id" UUID,
    "abierta" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "caja_sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caja_movimientos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "referencia_id" UUID,
    "usuario_id" UUID NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caja_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sucursal_origen_id" UUID NOT NULL,
    "sucursal_destino_id" UUID NOT NULL,
    "estado" "EstadoTransferencia" NOT NULL DEFAULT 'SOLICITADA',
    "solicitante_id" UUID NOT NULL,
    "despachador_id" UUID,
    "receptor_id" UUID,
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_despacho" TIMESTAMP(3),
    "fecha_recepcion" TIMESTAMP(3),
    "notas" TEXT,
    "motivo_rechazo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencia_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "transferencia_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "lote_id" UUID,
    "cantidad_solicitada" DECIMAL(12,4) NOT NULL,
    "cantidad_despachada" DECIMAL(12,4),
    "cantidad_recibida" DECIMAL(12,4),
    "motivo_discrepancia" TEXT,

    CONSTRAINT "transferencia_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "proveedor_id" UUID NOT NULL,
    "fecha_pedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_esperada" DATE,
    "fecha_llegada_estimada" TIMESTAMP(3),
    "tracking" TEXT,
    "transportista" TEXT,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'BORRADOR',
    "moneda" "Moneda" NOT NULL DEFAULT 'BOB',
    "tipo_cambio_estimado" DECIMAL(12,6),
    "tipo_cambio_recepcion" DECIMAL(12,6),
    "notas" TEXT,
    "motivo_cancelacion" TEXT,
    "compra_id" UUID,
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad_pedida" DECIMAL(12,4) NOT NULL,
    "cantidad_recibida" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "precio_unit_origen" DECIMAL(12,4),
    "precio_unit_bob_estimado" DECIMAL(12,4),

    CONSTRAINT "pedido_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devoluciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "venta_id" UUID,
    "cliente_id" UUID,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoDevolucion" NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoDevolucion" NOT NULL DEFAULT 'PENDIENTE',
    "usuario_id" UUID NOT NULL,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devolucion_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "devolucion_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "condicion" "CondicionDevolucion" NOT NULL,
    "lote_id" UUID,

    CONSTRAINT "devolucion_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devolucion_cambios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "devolucion_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "devolucion_cambios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anulaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entidad_tipo" "EntidadAnulacion" NOT NULL,
    "entidad_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "motivo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detalles_reversion" JSON NOT NULL,

    CONSTRAINT "anulaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_mensajes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "remitente_id" UUID NOT NULL,
    "sucursal_destino_id" UUID,
    "destinatario_id" UUID,
    "contenido" TEXT NOT NULL,
    "tipo" "TipoChatMensaje" NOT NULL DEFAULT 'texto',
    "referencia_id" UUID,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "configuracion_tenant_id_idx" ON "configuracion"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_tenant_id_key" ON "configuracion"("tenant_id");

-- CreateIndex
CREATE INDEX "sucursales_tenant_id_idx" ON "sucursales"("tenant_id");

-- CreateIndex
CREATE INDEX "sucursales_tenant_id_es_central_idx" ON "sucursales"("tenant_id", "es_central");

-- CreateIndex
CREATE INDEX "usuarios_tenant_id_idx" ON "usuarios"("tenant_id");

-- CreateIndex
CREATE INDEX "usuarios_tenant_id_rol_idx" ON "usuarios"("tenant_id", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tenant_id_username_key" ON "usuarios"("tenant_id", "username");

-- CreateIndex
CREATE INDEX "usuarios_sucursales_tenant_id_idx" ON "usuarios_sucursales"("tenant_id");

-- CreateIndex
CREATE INDEX "usuarios_sucursales_tenant_id_usuario_id_idx" ON "usuarios_sucursales"("tenant_id", "usuario_id");

-- CreateIndex
CREATE INDEX "usuarios_sucursales_tenant_id_sucursal_id_idx" ON "usuarios_sucursales"("tenant_id", "sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_sucursales_tenant_id_usuario_id_sucursal_id_key" ON "usuarios_sucursales"("tenant_id", "usuario_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "roles_permisos_tenant_id_idx" ON "roles_permisos"("tenant_id");

-- CreateIndex
CREATE INDEX "roles_permisos_tenant_id_rol_idx" ON "roles_permisos"("tenant_id", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "roles_permisos_tenant_id_rol_modulo_key" ON "roles_permisos"("tenant_id", "rol", "modulo");

-- CreateIndex
CREATE INDEX "categorias_tenant_id_idx" ON "categorias"("tenant_id");

-- CreateIndex
CREATE INDEX "categorias_tenant_id_parent_id_idx" ON "categorias"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "proveedores_tenant_id_idx" ON "proveedores"("tenant_id");

-- CreateIndex
CREATE INDEX "proveedores_tenant_id_nit_ci_idx" ON "proveedores"("tenant_id", "nit_ci");

-- CreateIndex
CREATE INDEX "clientes_tenant_id_idx" ON "clientes"("tenant_id");

-- CreateIndex
CREATE INDEX "clientes_tenant_id_nit_ci_idx" ON "clientes"("tenant_id", "nit_ci");

-- CreateIndex
CREATE INDEX "productos_tenant_id_idx" ON "productos"("tenant_id");

-- CreateIndex
CREATE INDEX "productos_tenant_id_tipo_idx" ON "productos"("tenant_id", "tipo");

-- CreateIndex
CREATE INDEX "productos_tenant_id_categoria_id_idx" ON "productos"("tenant_id", "categoria_id");

-- CreateIndex
CREATE INDEX "productos_tenant_id_codigo_barras_idx" ON "productos"("tenant_id", "codigo_barras");

-- CreateIndex
CREATE INDEX "productos_tenant_id_activo_idx" ON "productos"("tenant_id", "activo");

-- CreateIndex
CREATE INDEX "producto_atributos_tenant_id_idx" ON "producto_atributos"("tenant_id");

-- CreateIndex
CREATE INDEX "producto_atributos_tenant_id_producto_id_idx" ON "producto_atributos"("tenant_id", "producto_id");

-- CreateIndex
CREATE INDEX "producto_atributos_tenant_id_producto_id_clave_idx" ON "producto_atributos"("tenant_id", "producto_id", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "producto_precios_producto_id_key" ON "producto_precios"("producto_id");

-- CreateIndex
CREATE INDEX "producto_precios_tenant_id_idx" ON "producto_precios"("tenant_id");

-- CreateIndex
CREATE INDEX "producto_precios_tenant_id_producto_id_idx" ON "producto_precios"("tenant_id", "producto_id");

-- CreateIndex
CREATE INDEX "lotes_tenant_id_idx" ON "lotes"("tenant_id");

-- CreateIndex
CREATE INDEX "lotes_tenant_id_sucursal_id_producto_id_idx" ON "lotes"("tenant_id", "sucursal_id", "producto_id");

-- CreateIndex
CREATE INDEX "lotes_tenant_id_producto_id_fecha_ingreso_idx" ON "lotes"("tenant_id", "producto_id", "fecha_ingreso");

-- CreateIndex
CREATE INDEX "lotes_tenant_id_producto_id_fecha_vencimiento_idx" ON "lotes"("tenant_id", "producto_id", "fecha_vencimiento");

-- CreateIndex
CREATE INDEX "lotes_tenant_id_sucursal_id_idx" ON "lotes"("tenant_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "receta_items_tenant_id_idx" ON "receta_items"("tenant_id");

-- CreateIndex
CREATE INDEX "receta_items_tenant_id_producto_padre_id_idx" ON "receta_items"("tenant_id", "producto_padre_id");

-- CreateIndex
CREATE UNIQUE INDEX "receta_items_tenant_id_producto_padre_id_producto_hijo_id_key" ON "receta_items"("tenant_id", "producto_padre_id", "producto_hijo_id");

-- CreateIndex
CREATE INDEX "ajustes_inventario_tenant_id_idx" ON "ajustes_inventario"("tenant_id");

-- CreateIndex
CREATE INDEX "ajustes_inventario_tenant_id_sucursal_id_idx" ON "ajustes_inventario"("tenant_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "ajustes_inventario_tenant_id_producto_id_idx" ON "ajustes_inventario"("tenant_id", "producto_id");

-- CreateIndex
CREATE INDEX "ajustes_inventario_tenant_id_fecha_idx" ON "ajustes_inventario"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "tipos_cambio_tenant_id_idx" ON "tipos_cambio"("tenant_id");

-- CreateIndex
CREATE INDEX "tipos_cambio_tenant_id_moneda_fecha_idx" ON "tipos_cambio"("tenant_id", "moneda", "fecha");

-- CreateIndex
CREATE INDEX "compras_tenant_id_idx" ON "compras"("tenant_id");

-- CreateIndex
CREATE INDEX "compras_tenant_id_sucursal_id_idx" ON "compras"("tenant_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "compras_tenant_id_proveedor_id_idx" ON "compras"("tenant_id", "proveedor_id");

-- CreateIndex
CREATE INDEX "compras_tenant_id_fecha_idx" ON "compras"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "compras_tenant_id_estado_idx" ON "compras"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "compra_items_tenant_id_idx" ON "compra_items"("tenant_id");

-- CreateIndex
CREATE INDEX "compra_items_tenant_id_compra_id_idx" ON "compra_items"("tenant_id", "compra_id");

-- CreateIndex
CREATE INDEX "compra_items_tenant_id_producto_id_idx" ON "compra_items"("tenant_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_pagar_compra_id_key" ON "cuentas_pagar"("compra_id");

-- CreateIndex
CREATE INDEX "cuentas_pagar_tenant_id_idx" ON "cuentas_pagar"("tenant_id");

-- CreateIndex
CREATE INDEX "cuentas_pagar_tenant_id_estado_idx" ON "cuentas_pagar"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "cuentas_pagar_tenant_id_fecha_vencimiento_idx" ON "cuentas_pagar"("tenant_id", "fecha_vencimiento");

-- CreateIndex
CREATE INDEX "ventas_tenant_id_idx" ON "ventas"("tenant_id");

-- CreateIndex
CREATE INDEX "ventas_tenant_id_sucursal_id_idx" ON "ventas"("tenant_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "ventas_tenant_id_cliente_id_idx" ON "ventas"("tenant_id", "cliente_id");

-- CreateIndex
CREATE INDEX "ventas_tenant_id_fecha_idx" ON "ventas"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "ventas_tenant_id_estado_idx" ON "ventas"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "ventas_tenant_id_sesion_caja_id_idx" ON "ventas"("tenant_id", "sesion_caja_id");

-- CreateIndex
CREATE INDEX "venta_items_tenant_id_idx" ON "venta_items"("tenant_id");

-- CreateIndex
CREATE INDEX "venta_items_tenant_id_venta_id_idx" ON "venta_items"("tenant_id", "venta_id");

-- CreateIndex
CREATE INDEX "venta_items_tenant_id_producto_id_idx" ON "venta_items"("tenant_id", "producto_id");

-- CreateIndex
CREATE INDEX "cotizaciones_tenant_id_idx" ON "cotizaciones"("tenant_id");

-- CreateIndex
CREATE INDEX "cotizaciones_tenant_id_sucursal_id_idx" ON "cotizaciones"("tenant_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "cotizaciones_tenant_id_cliente_id_idx" ON "cotizaciones"("tenant_id", "cliente_id");

-- CreateIndex
CREATE INDEX "cotizaciones_tenant_id_estado_idx" ON "cotizaciones"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "cotizaciones_tenant_id_fecha_vencimiento_idx" ON "cotizaciones"("tenant_id", "fecha_vencimiento");

-- CreateIndex
CREATE INDEX "cotizacion_items_tenant_id_idx" ON "cotizacion_items"("tenant_id");

-- CreateIndex
CREATE INDEX "cotizacion_items_tenant_id_cotizacion_id_idx" ON "cotizacion_items"("tenant_id", "cotizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_cobrar_venta_id_key" ON "cuentas_cobrar"("venta_id");

-- CreateIndex
CREATE INDEX "cuentas_cobrar_tenant_id_idx" ON "cuentas_cobrar"("tenant_id");

-- CreateIndex
CREATE INDEX "cuentas_cobrar_tenant_id_cliente_id_idx" ON "cuentas_cobrar"("tenant_id", "cliente_id");

-- CreateIndex
CREATE INDEX "cuentas_cobrar_tenant_id_estado_idx" ON "cuentas_cobrar"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "cuentas_cobrar_tenant_id_fecha_vencimiento_idx" ON "cuentas_cobrar"("tenant_id", "fecha_vencimiento");

-- CreateIndex
CREATE INDEX "pagos_tenant_id_idx" ON "pagos"("tenant_id");

-- CreateIndex
CREATE INDEX "pagos_tenant_id_entidad_tipo_entidad_id_idx" ON "pagos"("tenant_id", "entidad_tipo", "entidad_id");

-- CreateIndex
CREATE INDEX "pagos_tenant_id_sesion_caja_id_idx" ON "pagos"("tenant_id", "sesion_caja_id");

-- CreateIndex
CREATE INDEX "pagos_tenant_id_fecha_idx" ON "pagos"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "caja_sesiones_tenant_id_idx" ON "caja_sesiones"("tenant_id");

-- CreateIndex
CREATE INDEX "caja_sesiones_tenant_id_sucursal_id_idx" ON "caja_sesiones"("tenant_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "caja_sesiones_tenant_id_sucursal_id_abierta_idx" ON "caja_sesiones"("tenant_id", "sucursal_id", "abierta");

-- CreateIndex
CREATE INDEX "caja_movimientos_tenant_id_idx" ON "caja_movimientos"("tenant_id");

-- CreateIndex
CREATE INDEX "caja_movimientos_tenant_id_sesion_id_idx" ON "caja_movimientos"("tenant_id", "sesion_id");

-- CreateIndex
CREATE INDEX "caja_movimientos_tenant_id_fecha_idx" ON "caja_movimientos"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "transferencias_tenant_id_idx" ON "transferencias"("tenant_id");

-- CreateIndex
CREATE INDEX "transferencias_tenant_id_sucursal_origen_id_idx" ON "transferencias"("tenant_id", "sucursal_origen_id");

-- CreateIndex
CREATE INDEX "transferencias_tenant_id_sucursal_destino_id_idx" ON "transferencias"("tenant_id", "sucursal_destino_id");

-- CreateIndex
CREATE INDEX "transferencias_tenant_id_estado_idx" ON "transferencias"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "transferencias_tenant_id_fecha_solicitud_idx" ON "transferencias"("tenant_id", "fecha_solicitud");

-- CreateIndex
CREATE INDEX "transferencia_items_tenant_id_idx" ON "transferencia_items"("tenant_id");

-- CreateIndex
CREATE INDEX "transferencia_items_tenant_id_transferencia_id_idx" ON "transferencia_items"("tenant_id", "transferencia_id");

-- CreateIndex
CREATE INDEX "transferencia_items_tenant_id_producto_id_idx" ON "transferencia_items"("tenant_id", "producto_id");

-- CreateIndex
CREATE INDEX "pedidos_tenant_id_idx" ON "pedidos"("tenant_id");

-- CreateIndex
CREATE INDEX "pedidos_tenant_id_sucursal_id_idx" ON "pedidos"("tenant_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "pedidos_tenant_id_proveedor_id_idx" ON "pedidos"("tenant_id", "proveedor_id");

-- CreateIndex
CREATE INDEX "pedidos_tenant_id_estado_idx" ON "pedidos"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "pedidos_tenant_id_fecha_pedido_idx" ON "pedidos"("tenant_id", "fecha_pedido");

-- CreateIndex
CREATE INDEX "pedido_items_tenant_id_idx" ON "pedido_items"("tenant_id");

-- CreateIndex
CREATE INDEX "pedido_items_tenant_id_pedido_id_idx" ON "pedido_items"("tenant_id", "pedido_id");

-- CreateIndex
CREATE INDEX "devoluciones_tenant_id_idx" ON "devoluciones"("tenant_id");

-- CreateIndex
CREATE INDEX "devoluciones_tenant_id_sucursal_id_idx" ON "devoluciones"("tenant_id", "sucursal_id");

-- CreateIndex
CREATE INDEX "devoluciones_tenant_id_venta_id_idx" ON "devoluciones"("tenant_id", "venta_id");

-- CreateIndex
CREATE INDEX "devoluciones_tenant_id_cliente_id_idx" ON "devoluciones"("tenant_id", "cliente_id");

-- CreateIndex
CREATE INDEX "devoluciones_tenant_id_estado_idx" ON "devoluciones"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "devolucion_items_tenant_id_idx" ON "devolucion_items"("tenant_id");

-- CreateIndex
CREATE INDEX "devolucion_items_tenant_id_devolucion_id_idx" ON "devolucion_items"("tenant_id", "devolucion_id");

-- CreateIndex
CREATE INDEX "devolucion_cambios_tenant_id_idx" ON "devolucion_cambios"("tenant_id");

-- CreateIndex
CREATE INDEX "devolucion_cambios_tenant_id_devolucion_id_idx" ON "devolucion_cambios"("tenant_id", "devolucion_id");

-- CreateIndex
CREATE INDEX "anulaciones_tenant_id_idx" ON "anulaciones"("tenant_id");

-- CreateIndex
CREATE INDEX "anulaciones_tenant_id_entidad_tipo_entidad_id_idx" ON "anulaciones"("tenant_id", "entidad_tipo", "entidad_id");

-- CreateIndex
CREATE INDEX "anulaciones_tenant_id_fecha_idx" ON "anulaciones"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "anulaciones_tenant_id_usuario_id_idx" ON "anulaciones"("tenant_id", "usuario_id");

-- CreateIndex
CREATE INDEX "chat_mensajes_tenant_id_idx" ON "chat_mensajes"("tenant_id");

-- CreateIndex
CREATE INDEX "chat_mensajes_tenant_id_sucursal_destino_id_idx" ON "chat_mensajes"("tenant_id", "sucursal_destino_id");

-- CreateIndex
CREATE INDEX "chat_mensajes_tenant_id_remitente_id_idx" ON "chat_mensajes"("tenant_id", "remitente_id");

-- CreateIndex
CREATE INDEX "chat_mensajes_tenant_id_destinatario_id_idx" ON "chat_mensajes"("tenant_id", "destinatario_id");

-- CreateIndex
CREATE INDEX "chat_mensajes_tenant_id_created_at_idx" ON "chat_mensajes"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "usuarios_sucursales" ADD CONSTRAINT "usuarios_sucursales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_sucursales" ADD CONSTRAINT "usuarios_sucursales_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_atributos" ADD CONSTRAINT "producto_atributos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_precios" ADD CONSTRAINT "producto_precios_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_items" ADD CONSTRAINT "receta_items_producto_padre_id_fkey" FOREIGN KEY ("producto_padre_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_items" ADD CONSTRAINT "receta_items_producto_hijo_id_fkey" FOREIGN KEY ("producto_hijo_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_inventario" ADD CONSTRAINT "ajustes_inventario_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_inventario" ADD CONSTRAINT "ajustes_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_inventario" ADD CONSTRAINT "ajustes_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_cambio" ADD CONSTRAINT "tipos_cambio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_pagar" ADD CONSTRAINT "cuentas_pagar_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "caja_sesiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_items" ADD CONSTRAINT "cotizacion_items_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_items" ADD CONSTRAINT "cotizacion_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_cobrar" ADD CONSTRAINT "cuentas_cobrar_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_cobrar" ADD CONSTRAINT "cuentas_cobrar_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_cobrar" ADD CONSTRAINT "cuentas_cobrar_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_sesion_caja_id_fkey" FOREIGN KEY ("sesion_caja_id") REFERENCES "caja_sesiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pago_venta_fk" FOREIGN KEY ("entidad_id") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pago_compra_fk" FOREIGN KEY ("entidad_id") REFERENCES "compras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pago_cxc_fk" FOREIGN KEY ("entidad_id") REFERENCES "cuentas_cobrar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pago_cxp_fk" FOREIGN KEY ("entidad_id") REFERENCES "cuentas_pagar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pago_devolucion_fk" FOREIGN KEY ("entidad_id") REFERENCES "devoluciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_sesiones" ADD CONSTRAINT "caja_sesiones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_movimientos" ADD CONSTRAINT "caja_movimientos_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "caja_sesiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_sucursal_origen_id_fkey" FOREIGN KEY ("sucursal_origen_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_sucursal_destino_id_fkey" FOREIGN KEY ("sucursal_destino_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_despachador_id_fkey" FOREIGN KEY ("despachador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_receptor_id_fkey" FOREIGN KEY ("receptor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia_items" ADD CONSTRAINT "transferencia_items_transferencia_id_fkey" FOREIGN KEY ("transferencia_id") REFERENCES "transferencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia_items" ADD CONSTRAINT "transferencia_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia_items" ADD CONSTRAINT "transferencia_items_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_items" ADD CONSTRAINT "devolucion_items_devolucion_id_fkey" FOREIGN KEY ("devolucion_id") REFERENCES "devoluciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_items" ADD CONSTRAINT "devolucion_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_items" ADD CONSTRAINT "devolucion_items_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_cambios" ADD CONSTRAINT "devolucion_cambios_devolucion_id_fkey" FOREIGN KEY ("devolucion_id") REFERENCES "devoluciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_cambios" ADD CONSTRAINT "devolucion_cambios_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anulaciones" ADD CONSTRAINT "anulaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anulaciones" ADD CONSTRAINT "anulaciones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mensajes" ADD CONSTRAINT "chat_mensajes_remitente_id_fkey" FOREIGN KEY ("remitente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mensajes" ADD CONSTRAINT "chat_mensajes_sucursal_destino_id_fkey" FOREIGN KEY ("sucursal_destino_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
