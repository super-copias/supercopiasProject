# 📋 Historial de Cambios - Base de Datos SuperCopias

Este archivo registra todos los cambios estructurales aplicados a la base de datos.

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
