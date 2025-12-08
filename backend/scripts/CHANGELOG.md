# 📋 Historial de Cambios - Base de Datos SuperCopias

Este archivo registra todos los cambios estructurales aplicados a la base de datos.

---

## [2025-12-04] Submódulo de Reglas de Stock Personalizadas

### Cambios en Base de Datos
- ✅ **NUEVA TABLA**: `inventarios_reglas_stock`
  - `id` SERIAL PRIMARY KEY
  - `inventario_id` INTEGER NOT NULL UNIQUE
  - `nivel_critico_porcentaje` DECIMAL(5,2) DEFAULT 0
  - `nivel_bajo_porcentaje` DECIMAL(5,2) DEFAULT 10
  - `nivel_normal_porcentaje` DECIMAL(5,2) DEFAULT 30
  - `usar_stock_maximo` BOOLEAN DEFAULT true
  - `alerta_critico_activa` BOOLEAN DEFAULT true
  - `alerta_bajo_activa` BOOLEAN DEFAULT true
  - `alerta_sobrestock_activa` BOOLEAN DEFAULT false
  - `umbral_sobrestock_porcentaje` DECIMAL(5,2) DEFAULT 0
  - `notificar_usuarios` JSONB (para futuro sistema de notificaciones)
  - `observaciones` TEXT
  - `activo` BOOLEAN DEFAULT true
  - `fecha_creacion` TIMESTAMP DEFAULT NOW()
  - `fecha_modificacion` TIMESTAMP DEFAULT NOW()
- ✅ **Constraints**:
  - `UNIQUE(inventario_id)` - Un inventario solo puede tener una configuración activa
  - `CHECK` - Valida orden: `nivel_critico ≤ nivel_bajo ≤ nivel_normal`
  - `CHECK` - Valida que porcentajes sean >= 0
- ✅ **Foreign Key**:
  - `fk_inventarios_reglas_stock_inventario` → inventarios(id) ON DELETE CASCADE
- ✅ **Índices**:
  - `idx_inventarios_reglas_stock_inventario` - Acelera JOIN con inventarios
  - `idx_inventarios_reglas_stock_activo` - Filtrado por estado activo
- ✅ **Script de Migración**: `backend/scripts/add-reglas-stock.sql`

### Motivación del Cambio
- 🎯 **Personalización por producto**: Cada artículo puede tener umbrales de alerta diferentes
- 🔄 **Flexibilidad de rotación**: Productos de alta rotación vs baja rotación necesitan reglas distintas
- 📊 **Dual-mode calculation**:
  - **Modo 1**: Porcentaje del rango (mínimo - máximo) - recomendado
  - **Modo 2**: Porcentaje sobre mínimo solamente
- 🔔 **Control de alertas**: Activar/desactivar alertas por nivel independientemente
- ⚙️ **Sin código**: Todo configurable desde interfaz web
- 🔙 **Backward compatible**: Si no hay reglas personalizadas, usa defaults del sistema (10%)

### Cambios en Backend (`inventariosController.js`)
- ✅ **4 Nuevos Endpoints CRUD**:
  - `getReglasStock()` - GET /api/inventarios/:id/reglas-stock
    - Retorna reglas personalizadas o defaults del sistema
    - Incluye contexto: `stock_minimo`, `stock_maximo`, `tiene_reglas_personalizadas`
  - `createReglasStock()` - POST /api/inventarios/:id/reglas-stock
    - Validaciones: orden de porcentajes, valores negativos, duplicados
    - Usa COALESCE para defaults (0%, 10%, 30%, true, true, true, false, 0)
  - `updateReglasStock()` - PUT /api/inventarios/:id/reglas-stock
    - Actualiza solo campos enviados (PATCH-like behavior)
    - Valida existencia de reglas antes de actualizar
  - `deleteReglasStock()` - DELETE /api/inventarios/:id/reglas-stock
    - Hard delete para permitir volver a reglas por defecto
- ✅ **Modificación de `listInventarios()`**:
  - LEFT JOIN con `inventarios_reglas_stock`
  - CASE statement complejo con 2 modos de cálculo:
    - Con `usar_stock_maximo` = true: calcula umbrales como % del rango (min-max)
    - Con `usar_stock_maximo` = false: calcula umbrales como % sobre mínimo
  - Agrega campo calculado `tiene_reglas_personalizadas`
- ✅ **Modificación de `getAlertas()`**:
  - Respeta flags de activación: `alerta_critico_activa`, `alerta_bajo_activa`, `alerta_sobrestock_activa`
  - Solo genera alertas si el flag correspondiente = true
  - LEFT JOIN con reglas personalizadas

### Cambios en Backend (`routes/inventarios.js`)
- ✅ 4 nuevas rutas:
  - GET /:id/reglas-stock
  - POST /:id/reglas-stock
  - PUT /:id/reglas-stock
  - DELETE /:id/reglas-stock

### Cambios en Frontend (`inventarios.service.ts`)
- ✅ **Nueva Interface**: `ReglasStock` (18 propiedades)
  - Mapea 1:1 con tabla BD + campos calculados
- ✅ **4 Nuevos Métodos HTTP**:
  - `getReglasStock(inventarioId: number): Observable<ReglasStock>`
  - `createReglasStock(inventarioId, reglas): Observable<any>`
  - `updateReglasStock(inventarioId, reglas): Observable<any>`
  - `deleteReglasStock(inventarioId): Observable<any>`

### Cambios en Frontend (Nuevo Componente)
- ✅ **ReglasStockComponent** (`reglas-stock/reglas-stock.component.*`):
  - **TypeScript** (200 líneas):
    - `cargarReglas()` - Carga desde API o defaults
    - `calcularUmbrales()` - Calcula umbrales en tiempo real con dual-mode logic
    - `guardarReglas()` - Validación de orden + CREATE o UPDATE según existan reglas
    - `restaurarValores()` - Reset a defaults con confirmación
    - `eliminarReglas()` - DELETE con confirmación
    - `onCambioModo()`, `onCambioPorcentaje()` - Recalculo automático de umbrales
  - **HTML** (300 líneas):
    - Display de stock_minimo/stock_maximo
    - Radio buttons para modo de cálculo
    - Inputs numéricos para 4 porcentajes (crítico, bajo, normal, sobrestock)
    - Switches para activar/desactivar alertas por nivel
    - Textarea para observaciones
    - Vista previa lateral con umbrales calculados en tiempo real
    - Badges de colores por nivel (rojo/amarillo/verde/azul)
    - Botones: Guardar, Restaurar, Eliminar, Cancelar
  - **SCSS**: Estilos para badges, sticky sidebar, animaciones fadeIn

### Cambios en Módulo (`inventarios.module.ts`)
- ✅ Importación de `ReglasStockComponent`
- ✅ Declaración en `@NgModule`
- ✅ Nueva ruta: `{ path: ':id/reglas-stock', component: ReglasStockComponent }`

### Validación de Consistencia
- ✅ **Documento completo**: `VALIDACION-REGLAS-STOCK.md`
  - Tabla comparativa de 18 campos: BD ↔ Backend ↔ Frontend
  - Validación de los 4 endpoints con ejemplos de Request/Response
  - Explicación detallada del dual-mode calculation
  - Comparación de queries SQL vs lógica TypeScript
  - 4 casos de uso validados end-to-end
  - Triple capa de validaciones (BD CHECK + Backend + Frontend)

### Testing Recomendado
- [ ] Crear reglas personalizadas para producto de alta rotación (20% bajo, 50% normal)
- [ ] Crear reglas para producto de baja rotación (5% bajo, 15% normal)
- [ ] Verificar cálculo de umbrales en modo 1 (con stock_maximo)
- [ ] Verificar cálculo de umbrales en modo 2 (sin stock_maximo)
- [ ] Desactivar alerta de nivel bajo y verificar que no aparezca en `getAlertas()`
- [ ] Eliminar reglas y verificar fallback a defaults del sistema (10%)
- [ ] Actualizar solo observaciones y verificar que no afecte otros campos

### Archivos Modificados/Creados
**Backend:**
- `BD_SUPERCOPIAS.sql` - Agregada tabla completa
- `scripts/add-reglas-stock.sql` - Script de migración
- `controllers/inventariosController.js` - 4 funciones + 2 queries modificados (270 líneas)
- `routes/inventarios.js` - 4 rutas nuevas

**Frontend:**
- `services/inventarios.service.ts` - Interface + 4 métodos (50 líneas)
- `modules/admin/inventarios/reglas-stock/reglas-stock.component.ts` - 200 líneas
- `modules/admin/inventarios/reglas-stock/reglas-stock.component.html` - 300 líneas
- `modules/admin/inventarios/reglas-stock/reglas-stock.component.scss` - 30 líneas
- `modules/admin/inventarios/inventarios.module.ts` - Import + declaración + ruta

**Documentación:**
- `SUBMODULO-REGLAS-STOCK.md` - Diseño completo del submódulo
- `VALIDACION-REGLAS-STOCK.md` - Validación BD-Backend-Frontend

---

## [2025-12-04] Gestión de Categorías Personalizadas - Inventarios

### Cambios en Base de Datos
- ✅ **NUEVA FUNCIONALIDAD**: Sistema de categorías personalizadas con campos dinámicos
- ✅ Actualización tabla `inventarios_categorias`:
  - `campos_requeridos JSONB` - Definición de campos personalizados por categoría
  - `fecha_modificacion TIMESTAMP` - Control de cambios
- ✅ Actualización tabla `inventarios`:
  - `stock_maximo NUMERIC(10,2)` - Stock máximo recomendado
  - `proveedor_id INTEGER` - Relación con tabla proveedores (FK)
- ✅ Nuevos índices:
  - `idx_inventarios_proveedor` - Para búsqueda por proveedor
  - `idx_inventarios_categorias_tipo` - Para filtrado por tipo
  - `idx_inventarios_categorias_activo` - Para filtrado de activos
- ✅ Foreign key constraint:
  - `fk_inventarios_proveedor` - inventarios.proveedor_id → proveedores.id (ON DELETE SET NULL)

### Motivación del Cambio
- 🏷️ **Personalización**: Usuarios pueden crear sus propias categorías
- 🔧 **Flexibilidad total**: Cada categoría puede tener campos específicos (JSONB)
- 📊 **Sin límites**: El sistema crece sin necesidad de programación
- 🔒 **Validaciones**: Previene eliminación de categorías con artículos asociados
- 🎯 **Usabilidad**: Todo desde interfaz web, sin tocar código

### Cambios en Backend
- ✅ `inventariosController.js` - Nuevas funciones CRUD:
  - `createCategoria()` - POST /api/inventarios/categorias
  - `updateCategoria()` - PUT /api/inventarios/categorias/:id
  - `deleteCategoria()` - DELETE /api/inventarios/categorias/:id (con validación)
- ✅ Validaciones implementadas:
  - Nombre único por tipo
  - No permite eliminar categorías con artículos asociados
  - Auto-asignación de orden
  - Verificación de tipos válidos (venta, insumo, generico)

### Cambios en Frontend
- ✅ Nuevo componente `categorias-list.component`:
  - Dashboard con contadores por tipo
  - Formulario inline para crear/editar categorías
  - Sistema de campos dinámicos (texto, número, fecha, select)
  - Tabla con filtros y CRUD completo
- ✅ `inventarios.service.ts` - Nuevos métodos:
  - `createCategoria()`
  - `updateCategoriaById()`
  - `deleteCategoria()`
- ✅ Navegación actualizada:
  - Botón "Categorías" en listado de inventarios
  - Ruta: /admin/inventarios/categorias

### Script de Migración
- 📄 `update-categorias-personalizadas.sql` - Migración segura con:
  - Validaciones IF NOT EXISTS
  - Creación de índices
  - Foreign keys condicionales
  - Comentarios en columnas
  - Verificación de resultados

### Documentación
- ✅ `MODULO-INVENTARIOS.md` - Nueva sección completa:
  - Gestión de Categorías Personalizadas
  - Mockups de interfaz
  - Flujo de uso
  - Ejemplos prácticos
  - Ventajas del sistema

---

## [2025-12-04] Módulo de Inventarios - Sistema Completo de Gestión

### Cambios en Base de Datos
- ✅ **NUEVO MÓDULO**: Sistema completo de gestión de inventarios
- ✅ Tabla `inventarios` - Tabla principal:
  - `tipo VARCHAR(30)` - Tipo: venta, insumo, generico
  - `nombre VARCHAR(255)` - Nombre del artículo
  - `categoria VARCHAR(100)` - Categoría del artículo
  - `existencia_actual NUMERIC(10,2)` - Stock actual
  - `stock_minimo NUMERIC(10,2)` - Stock mínimo configurable
  - `costo_compra, precio_venta, costo_promedio` - Control de costos
  - `unidad_medida VARCHAR(50)` - Unidad flexible (pieza, caja, resma, etc.)
  - Campos adicionales: marca, modelo, SKU, proveedor, ubicación
- ✅ Tabla `inventarios_caracteristicas` - Campos dinámicos JSONB:
  - Para papel: tamaño, gramaje, color, presentación
  - Para engargolado: tipo arillo, tamaño, color, tipo pasta
  - Para consumibles: compatibilidad, rendimiento, tipo
- ✅ Tabla `inventarios_movimientos` - Trazabilidad completa:
  - `tipo_movimiento` - entrada, salida, ajuste
  - `concepto` - compra, venta, uso_operativo, merma, etc.
  - `saldo_anterior, saldo_nuevo` - Control de existencias
  - `usuario_nombre, area_servicio, notas` - Información completa
  - `evidencia_url` - Soporte para adjuntar fotos
- ✅ Tabla `inventarios_categorias` - Catálogo extensible:
  - 7 categorías de productos para venta
  - 7 categorías de insumos operativos
  - 6 categorías de items genéricos
  - Total: 20 categorías predefinidas
- ✅ Índices optimizados para búsqueda, filtrado y reportes
- ✅ Foreign keys con CASCADE para integridad referencial

### Motivación del Cambio
- 📦 **Versatilidad**: Maneja productos de venta, insumos operativos e items genéricos
- 🔄 **Flexibilidad**: Campos dinámicos según categoría (JSONB)
- 📊 **Control**: Sistema de alertas automáticas de stock bajo/crítico
- 📝 **Trazabilidad**: Historial completo de todos los movimientos
- 💰 **Costos**: Control de precios, costos y márgenes de utilidad
- 🎨 **Intuitividad**: Diseño simple para personal administrativo y operativo

### Cambios en Backend
- ✅ `inventariosController.js` - Controlador completo:
  - `listInventarios()` - GET /api/inventarios (con filtros avanzados)
  - `getInventarioById()` - GET /api/inventarios/:id
  - `createInventario()` - POST /api/inventarios
  - `updateInventario()` - PUT /api/inventarios/:id
  - `deleteInventario()` - DELETE /api/inventarios/:id (soft delete)
  - `addMovimiento()` - POST /api/inventarios/:id/movimientos
  - `getHistorialMovimientos()` - GET /api/inventarios/:id/movimientos
  - `getAlertas()` - GET /api/inventarios/alertas
  - `getStats()` - GET /api/inventarios/stats
  - `getCategorias()` - GET /api/inventarios/categorias
- ✅ `routes/inventarios.js` - Rutas RESTful completas
- ✅ `index.js` - Integración del módulo al servidor
- ✅ Validación automática de existencias en salidas
- ✅ Cálculo automático de niveles de stock (crítico/bajo/normal)
- ✅ Registro automático de usuario en movimientos

### Cambios en Frontend
- ✅ `inventarios.service.ts` - Servicio Angular completo:
  - Métodos CRUD completos
  - Gestión de movimientos
  - Obtención de alertas y estadísticas
  - Métodos auxiliares para catálogos
  - Helpers para UI (badges, iconos, etiquetas)
- ✅ Módulo `InventariosModule` creado:
  - `InventariosComponent` - Componente raíz
  - `InventariosListComponent` - Lista con filtros avanzados
  - `InventarioFormComponent` - Formulario dinámico crear/editar
  - `InventarioDetalleComponent` - Vista detallada con pestañas
- ✅ Rutas configuradas: lista, nuevo, editar, detalle
- ✅ Integración con sistema de permisos existente

### Características del Módulo
- 🎯 **Filtros Avanzados**:
  - Por texto (nombre, marca, SKU)
  - Por tipo (venta, insumo, genérico)
  - Por categoría
  - Por nivel de stock (crítico, bajo, normal)
  - Por estatus (activo, inactivo)
- 📊 **Dashboard de Inventario**:
  - Total de artículos por tipo
  - Alertas críticas y bajas
  - Valor total del inventario
  - Estadísticas en tiempo real
- ⚠️ **Sistema de Alertas**:
  - Código de colores: 🔴 Crítico, 🟡 Bajo, 🟢 Normal
  - Cálculo automático: crítico < mínimo, bajo ≤ mínimo * 1.1
  - Listado priorizado de artículos con stock bajo
- 📝 **Movimientos**:
  - Entradas: compra, devolución, ajuste, transferencia
  - Salidas: venta, uso operativo, servicio técnico, merma
  - Ajustes: corrección de inventario
  - Historial completo con paginación
- 🎨 **Formularios Dinámicos**:
  - Campos específicos según categoría
  - Validaciones automáticas
  - Soporte para imágenes
  - Características personalizadas en JSONB

### Archivos Modificados/Creados
**Base de Datos:**
- `backend/BD_SUPERCOPIAS.sql` - Estructura actualizada con 4 tablas nuevas
- `backend/scripts/add-inventarios-module.sql` - Script de migración

**Backend:**
- `backend/controllers/inventariosController.js` - ✨ NUEVO
- `backend/routes/inventarios.js` - ✨ NUEVO
- `backend/index.js` - Integración de rutas

**Frontend:**
- `frontend/src/app/services/inventarios.service.ts` - ✨ NUEVO
- `frontend/src/app/modules/admin/inventarios/` - ✨ NUEVO MÓDULO
  - `inventarios.module.ts`
  - `inventarios.component.ts`
  - `inventarios-list/` - Componente lista
  - `inventario-form/` - Componente formulario
  - `inventario-detalle/` - Componente detalle

**Documentación:**
- `MODULO-INVENTARIOS.md` - ✨ Documentación completa del módulo

### Script de Migración
- ✅ Archivo: `backend/scripts/add-inventarios-module.sql`
- ✅ Incluye: Creación de tablas, índices, categorías y módulo
- ✅ Safe: Verifica existencia antes de insertar
- ✅ Mensajes informativos de progreso

### Próximos Pasos
- 🔜 Implementar componentes visuales de lista y detalle
- 🔜 Agregar gráficas de movimientos
- 🔜 Exportación de reportes (Excel, PDF)
- 🔜 Integración con punto de venta
- 🔜 Códigos de barras y lectores

---

## [2025-12-01] Sistema de Mantenimiento Preventivo con Alertas Automáticas

### Cambios en Base de Datos
- ✅ **NUEVA FUNCIONALIDAD**: Sistema de mantenimiento preventivo programado
- ✅ Tabla `equipos` - Nuevos campos:
  - `mantenimiento_intervalo_dias INTEGER` - Días entre mantenimientos (NULL = deshabilitado)
  - `mantenimiento_fecha_inicio DATE` - Fecha desde la cual empezar a contar
  - `mantenimiento_dias_alerta INTEGER DEFAULT 7` - Días de anticipación para alertas
- ✅ Vista `equipos_alertas_mantenimiento` - Cálculo automático de:
  - Último mantenimiento realizado
  - Próxima fecha de mantenimiento
  - Días restantes hasta el mantenimiento
  - Estado de alerta: `vencido`, `urgente`, `proximo`, `ok`, `sin_configurar`
- ✅ Lógica de cálculo basada en último servicio + intervalo configurado

### Motivación del Cambio
- 📅 **Automatización**: Alertas automáticas sin intervención manual
- ⚠️ **Prevención**: Evitar fallas por falta de mantenimiento
- 📊 **Visibilidad**: Dashboard con equipos que requieren atención
- ⚙️ **Flexibilidad**: Configuración opcional por equipo

### Cambios en Backend
- ✅ `equiposController.js` - Nuevos endpoints:
  - `configurarMantenimientoPreventivo()` - PUT /api/equipos/:id/mantenimiento-preventivo
  - `getAlertasMantenimiento()` - GET /api/equipos/alertas-mantenimiento
- ✅ Vista SQL consultada para obtener alertas en tiempo real
- ✅ Filtrado por estados: vencido > urgente > proximo

### Cambios en Frontend
- ✅ `equipos.service.ts` - Nuevos métodos:
  - `configurarMantenimientoPreventivo(equipoId, config)`
  - `getAlertasMantenimiento()`
- ✅ `equipo-detalle.component` - Nueva pestaña "Preventivo":
  - Formulario de configuración de intervalo
  - Selector de fecha de inicio
  - Configuración de días de anticipación
  - Información del estado actual
  - Botón para deshabilitar mantenimiento preventivo
- ✅ `equipos-list.component` - Sistema de alertas:
  - Tarjetas de alertas en la parte superior
  - Código de colores: Rojo (vencido), Amarillo (urgente), Azul (próximo)
  - Contador de días restantes/vencidos
  - Botón para ver detalles del equipo
  - Opción para ocultar alertas
- ✅ Diseño responsive con Bootstrap grid

### Archivos Modificados
- `backend/BD_SUPERCOPIAS.sql` - Estructura actualizada
- `backend/scripts/add-mantenimiento-preventivo.sql` - Script de migración
- `backend/controllers/equiposController.js`
- `backend/routes/equipos.js`
- `frontend/src/app/services/equipos.service.ts`
- `frontend/src/app/modules/admin/equipos/equipo-detalle/*`
- `frontend/src/app/modules/admin/equipos/equipos-list/*`

---

## [2025-11-30] Módulo de Gestión de Equipos - Refactorizado a Módulo Independiente

### Cambios en Base de Datos
- ✅ **REFACTORIZACIÓN**: Módulo convertido de diseño relacional a independiente
- ✅ Tabla `equipos` actualizada:
  - ❌ Eliminado `cliente_id INTEGER REFERENCES clientes(id)`
  - ✅ Agregado `cliente_nombre VARCHAR(255)` - Nombre del cliente (opcional)
  - ❌ Eliminado `responsable_id INTEGER REFERENCES empleados(id)`
  - ✅ Agregado `responsable_nombre VARCHAR(255)` - Nombre del técnico responsable (opcional)
  - ✅ Índice `idx_equipos_cliente_nombre` para búsquedas
- ✅ Tabla `equipos_caracteristicas` para características dinámicas (JSON)
- ✅ Tabla `equipos_historial_contador` actualizada:
  - ❌ Eliminado `tecnico_id INTEGER REFERENCES empleados(id)`
  - ✅ Agregado `tecnico_nombre VARCHAR(255)` - Nombre del técnico que tomó la lectura
- ✅ Tabla `equipos_mantenimiento` actualizada:
  - ❌ Eliminado `tecnico_id INTEGER REFERENCES empleados(id)`
  - ✅ Agregado `tecnico_nombre VARCHAR(255)` - Nombre del técnico que realizó el servicio
  - ✅ Agregado `proveedor_nombre VARCHAR(255)` - Nombre del proveedor (opcional)
- ✅ Tabla `equipos_consumibles` para control de consumibles
- ✅ Índices optimizados para búsqueda, filtrado y ordenamiento
- ❌ **SIN FOREIGN KEYS** - Módulo completamente independiente
- ✅ Constraints de validación para tipo de equipo y estatus

### Motivación del Cambio
- 🔒 **Independencia total**: El módulo de equipos no afecta módulos ya probados (clientes, empleados)
- 🚀 **Escalabilidad**: Permite agregar equipos de cualquier cliente sin depender de registros existentes
- 🛡️ **Seguridad**: Evita problemas de integridad referencial con módulos críticos
- 📊 **Simplicidad**: Relaciones de solo consulta mediante nombres (texto libre)

### Cambios en Backend
- ✅ Controlador `equiposController.js` actualizado:
  - ❌ Eliminados todos los LEFT JOIN con `clientes` y `empleados`
  - ✅ Métodos CRUD usan campos de nombres directamente
  - ✅ Métodos: `listEquipos()`, `getEquipoById()`, `createEquipo()`, `updateEquipo()`, `deleteEquipo()`
  - ✅ Historial de contador: `addContador()`, `getHistorialContador()`
  - ✅ Mantenimiento: `addMantenimiento()`, `getHistorialMantenimiento()`
  - ✅ Consumibles: `addConsumible()`, `getConsumibles()`
  - ✅ Estadísticas: `getStats()`
- ✅ Rutas `/api/equipos` sin cambios (compatibles)
- ✅ Integración en `index.js` del backend

### Cambios en Frontend
- ✅ Servicio `equipos.service.ts`:
  - ❌ Eliminadas propiedades: `cliente_id`, `responsable_id`, `tecnico_id`
  - ✅ Agregadas propiedades: `cliente_nombre`, `responsable_nombre`, `tecnico_nombre`, `proveedor_nombre`
  - ✅ Interfaces TypeScript actualizadas
- ✅ Componentes actualizados:
  - **EquiposFormComponent**: 
    - ❌ Eliminados selects de cliente/responsable
    - ✅ Agregados inputs de texto para nombres
  - **EquipoDetalleComponent**:
    - ✅ Formulario de contador con campo `tecnico_nombre`
    - ✅ Formulario de mantenimiento con campos `tecnico_nombre` y `proveedor_nombre`
    - ✅ Tablas actualizadas para mostrar nombres
  - **EquiposListComponent**: Sin cambios (ya usa nombres)

### Script de Migración
- ✅ `migrate-equipos-independiente.sql` - Convierte módulo relacional a independiente
  - Migra datos de IDs a nombres automáticamente
  - Elimina foreign keys
  - Elimina columnas de IDs
  - Crea índices para nombres
  - Verificación post-migración incluida

### Características Implementadas
- 📋 **Tipos de equipos**: Fotocopiadora, Impresora, PC, Laptop, Monitor, Router, Escáner, Otro
- 🔧 **Campos dinámicos**: Características específicas según tipo seleccionado
- 📊 **Historial de contador**: Registro cronológico para impresoras/fotocopiadoras
- 🛠️ **Mantenimiento**: Bitácora completa con descripción, costos, técnicos y proveedores
- 🖨️ **Consumibles**: Control de instalación, rendimiento y próximo cambio
- 🏷️ **Relaciones de consulta**: Nombres de clientes, técnicos y proveedores (texto libre)
- 🔄 **Estatus**: Activo, Inactivo, En Reparación, Dado de Baja
- 🔍 **Filtros**: Por tipo, estatus, cliente y búsqueda de texto
- 🔓 **Independencia total**: Sin dependencias de otros módulos

### Permisos y Roles
- ✅ Módulo `equipos` agregado al sistema de roles en `rolesSystem.js`
- ✅ Permisos configurados para: Administrador, Gestor de Inventarios

### Estado
✅ Módulo completamente funcional como independiente
✅ Refactorización aplicada en BD_SUPERCOPIAS.sql
✅ Script de migración disponible para bases de datos existentes
✅ Frontend actualizado y sin errores de compilación
✅ Documentado en DOCS.md y MODULO-EQUIPOS.md

---

## [2025-11-30] Módulo de Proveedores Completado

### Cambios en Base de Datos
- ✅ Tabla `proveedores` actualizada con dirección única
- ✅ Creados catálogos: `cat_tipos_proveedor`, `cat_metodos_pago_proveedor`
- ✅ Insertados 5 proveedores de ejemplo
- ✅ Insertados 3 tipos de proveedor (Productos, Servicios, Mixto)
- ✅ Insertados 6 métodos de pago

### Cambios en Backend
- ✅ Actualizado `proveedoresController.js`:
  - Métodos CRUD completos con formato estándar de respuesta
  - Endpoints de catálogos: `getTipos()`, `getMetodosPago()`
  - Conversión automática de claves a descripciones (SERVICIOS → Servicios)
  - Validación de RFC único entre proveedores activos
  - Búsqueda inteligente por múltiples campos

### Cambios en Frontend
- ✅ Componente completo de proveedores con:
  - Lista con búsqueda y paginación
  - Formulario multi-sección
  - Modal de detalles con impresión
  - Integración Google Maps para direcciones
  - Conversión bidireccional de catálogos
- ✅ Servicio `proveedores.service.ts` con todos los métodos HTTP

### Estado
✅ Módulo completamente funcional y probado
✅ Aplicado en BD_SUPERCOPIAS_UTF8.sql

---

## [2025-11-26] Módulo de Eventos de Personal

### Cambios en Base de Datos
- ✅ Tabla `eventos_personal` creada con todos los campos
- ✅ Agregadas columnas a `empleados`:
  - `dias_vacaciones_sugeridos INTEGER DEFAULT 12`
  - `notas_vacaciones TEXT`
- ✅ Vista `vacaciones_resumen` para consultas rápidas
- ✅ Índices de optimización
- ✅ Triggers de auditoría

### Cambios en Backend
- ✅ Controlador `eventosPersonalController.js` con métodos:
  - `listEventos()`, `createEvento()`, `updateEvento()`, `deleteEvento()`
  - `getResumenVacaciones()`, `getEstadisticas()`
- ✅ Rutas integradas en `/api/empleados/:id/eventos`

### Cambios en Frontend
- ✅ Servicio `eventos-personal.service.ts`
- ✅ Componente principal `EventosPersonalComponent`
- ✅ Modal de formulario `EventoPersonalFormModalComponent`
- ✅ Formularios especializados por tipo:
  - `FormVacacionesComponent` - Sistema flexible con advertencias
  - `FormFaltaComponent` - Justificadas/injustificadas
  - `FormPermisoComponent` - Por horas con cálculo automático
  - `FormOtroComponent` - Eventos especiales
- ✅ Integración en tab de detalle de empleados

### Características
- Sistema flexible de vacaciones (permite exceder días sugeridos)
- Cálculo automático de días tomados/restantes
- Advertencias visuales
- Resumen estadístico por año
- 4 tipos de eventos: Vacaciones, Faltas, Permisos, Otros

### Estado
✅ Implementado y funcional
✅ Documentado en MODULO-EVENTOS-PERSONAL.md

---

## [2025-11-26] Campo Turno en Empleados

### Cambios en Base de Datos
- ✅ Agregada columna `turno VARCHAR(20) NOT NULL`
- ✅ Constraint `empleados_turno_check` CHECK (turno IN ('Matutino', 'Vespertino'))
- ✅ Valor por defecto: 'Matutino'
- ✅ Registros existentes actualizados

### Cambios en Backend
- ✅ Actualizado `empleadosController.js`:
  - Campo incluido en create, update, get
  - Valor por defecto si no se proporciona

### Cambios en Frontend
- ✅ Select en formulario de empleados
- ✅ Columna en tabla (desktop y mobile)
- ✅ Campo en modal de detalle
- ✅ Incluido en documento de impresión

### Script de Migración
`add-turno-empleados.sql`

### Estado
✅ Aplicado en BD_SUPERCOPIAS_UTF8.sql
✅ Documentado en CAMPO-TURNO-EMPLEADOS.md

---

## [2025-11-24] Agregado Segundo Email a Clientes

### Cambios en Base de Datos
- ✅ Agregada columna `segundo_email VARCHAR(255)` a tabla `clientes`
- ✅ Agregado constraint `chk_clientes_segundo_email` para validación de formato
- ✅ Campo opcional (permite NULL)

### Cambios en Backend
- ✅ Actualizado `clientesController.js`:
  - Mapeo de `segundo_email` en todas las operaciones (list, get, create, update)
  - Validación de formato de email para `segundoEmail`
  - Incluido en respuestas API

### Cambios en Frontend
- ✅ Agregado campo "Segundo correo" en formulario de clientes
- ✅ Mostrado en vista de detalles (solo si existe)
- ✅ Incluido en impresión de cliente

### Script de Migración
`add-segundo-email-clientes.sql`

### Estado
✅ Aplicado en BD_SUPERCOPIAS.sql

---

## [2025-11-18] Agregado Segundo Teléfono a Clientes

### Cambios en Base de Datos
- ✅ Agregada columna `segundo_telefono VARCHAR(20)` a tabla `clientes`
- ✅ Campo opcional (permite NULL)

### Cambios en Backend
- ✅ Actualizado `clientesController.js` para incluir `segundoTelefono` en todas las operaciones

### Cambios en Frontend
- ✅ Agregado campo "Segundo teléfono" en formulario
- ✅ Mostrado en vista de detalles

### Script de Migración
`add-segundo-telefono-clientes.sql`

### Estado
✅ Aplicado en BD_SUPERCOPIAS.sql

---

## [2025-11-11] Separación de Direcciones de Entrega y Facturación

### Motivación
Diferenciar entre la dirección de entrega (donde se entregan productos) y la dirección de facturación (para emisión de facturas).

### Cambios en Base de Datos
- ✅ Columna `direccion` existente → `direccion_entrega`
- ✅ Agregada columna `direccion_facturacion TEXT`
- ✅ Ambos campos son independientes

### Cambios en Backend
- ✅ Actualizado `clientesController.js`:
  - `direccionEntrega` - dirección de entrega de productos
  - `direccion` - dirección de facturación
  - Ambas pueden ser iguales o diferentes

### Cambios en Frontend
- ✅ Formulario con labels claros:
  - "Dirección de entrega"
  - "Dirección de facturación"
- ✅ Vista de detalles muestra ambas direcciones
- ✅ Plantilla Excel actualizada con ejemplos

### Estado
✅ Aplicado (migraciones intermedias eliminadas, consolidado en BD_SUPERCOPIAS.sql)

---

## [2025-11-11] Simplificación de Estructura de Direcciones

### Motivación
Simplificar el almacenamiento de direcciones usando un solo campo de texto completo en lugar de múltiples campos separados.

### Cambios en Base de Datos
- ❌ Eliminadas columnas individuales:
  - `direccion_calle`
  - `direccion_numero`
  - `direccion_colonia`
  - `direccion_ciudad`
  - `direccion_estado`
- ✅ Mantenido `direccion` (TEXT) como campo consolidado
- ✅ Mantenido `direccion_codigo_postal` separado

### Estado
✅ Aplicado (consolidado en BD_SUPERCOPIAS.sql)

---

## [2025-11-11] Eliminación de Restricción UNIQUE en RFC

### Motivación
Permitir que múltiples clientes puedan compartir el mismo RFC (casos de uso real en negocios).

### Cambios en Base de Datos
- ❌ Eliminada restricción `UNIQUE` en columna `rfc`
- ❌ Eliminado índice único `idx_clientes_rfc`
- ✅ Creado índice normal (no único) para búsquedas

### Cambios en Backend
- ✅ Eliminadas validaciones de RFC duplicado en:
  - `createCliente()`
  - `updateCliente()`
  - `uploadExcelClientes()`

### Estado
✅ Aplicado (consolidado en BD_SUPERCOPIAS.sql)

---

## [Inicial] Creación de Estructura Base

### Tablas Creadas
- `usuarios` - Cuentas de acceso al sistema
- `empleados` - Información de empleados
- `clientes` - Base de clientes
- `proveedores` - Proveedores del negocio
- `modulos` - Módulos funcionales del sistema
- `empleados_modulos` - Relación empleados-módulos
- `sucursales` - Sucursales del negocio
- `puestos` - Catálogo de puestos
- `auditoria` - Registro de cambios

### Catálogos SAT
- `regimenes_fiscales` - Regímenes fiscales del SAT
- `usos_cfdi` - Usos de CFDI del SAT
- `formas_pago` - Formas de pago del SAT
- `metodos_pago` - Métodos de pago del SAT
- `estados` - Estados de la República Mexicana

### Triggers y Funciones
- `trg_clientes_updated_at` - Actualización automática de fecha_modificacion
- `trg_empleados_updated_at` - Actualización automática de fecha_modificacion
- `trg_usuarios_updated_at` - Actualización automática de updated_at
- Triggers de auditoría para rastrear cambios

### Estado
✅ Implementado en BD_SUPERCOPIAS.sql

---

## 📝 Notas Importantes

### Gestión de Migraciones
1. Cada cambio estructural debe tener su propio script de migración
2. Los scripts deben ser idempotentes (pueden ejecutarse múltiples veces)
3. Después de aplicar exitosamente, actualizar BD_SUPERCOPIAS.sql
4. Documentar cada cambio en este CHANGELOG

### Archivo Maestro
- **BD_SUPERCOPIAS.sql** es el archivo de referencia actualizado
- Contiene la estructura completa con todos los cambios aplicados
- Usar este archivo para crear nuevas instancias de la base de datos

### Scripts de Migración
- Se mantienen en `backend/scripts/` para referencia histórica
- Solo los scripts relevantes y actuales se conservan
- Scripts obsoletos o intermedios se eliminan después de consolidar

---

## 🔄 Próximas Mejoras Planificadas

- [ ] Implementar sistema de versionado de base de datos
- [ ] Agregar tablas para gestión de inventario
- [ ] Implementar sistema de pedidos/órdenes
- [ ] Agregar reportes y estadísticas
