# 🔧 Módulo de Gestión de Equipos - SuperCopias

**Fecha de creación**: 30 de noviembre de 2025  
**Versión**: 1.0.0

---

## 📋 Descripción General

El módulo de Equipos permite registrar, consultar, actualizar y dar seguimiento completo a todo tipo de equipos electrónicos que maneja el negocio, incluyendo fotocopiadoras, impresoras, PCs, laptops, monitores, routers, escáneres y cualquier otro equipo adicional.

### Objetivo

Centralizar la gestión de equipos con:
- Registro de información general y características específicas
- Historial de contadores para impresoras/fotocopiadoras
- Bitácora completa de mantenimientos y servicios
- Control de consumibles instalados
- Seguimiento de equipos en ubicaciones de clientes

---

## 🎯 Funcionalidades Principales

### 1. Gestión de Equipos (CRUD)

#### Tipos de Equipos Soportados:
- 📠 **Fotocopiadora**
- 🖨️ **Impresora**
- 💻 **PC**
- 💼 **Laptop**
- 🖥️ **Monitor**
- 📡 **Router**
- 📄 **Escáner**
- ⚙️ **Otro** (equipos adicionales)

#### Información General:
- Tipo de equipo (obligatorio)
- Marca y modelo
- Número de serie
- Nombre del equipo (opcional, ej: "Copiadora Planta Baja")
- Área o ubicación
- Cliente asignado (si aplica)
- Estatus: Activo, Inactivo, En Reparación, Dado de Baja
- Responsable técnico
- Observaciones generales
- Fotografía del equipo (opcional)

### 2. Características Específicas por Tipo

El formulario es **dinámico**: cambia según el tipo de equipo seleccionado.

#### Fotocopiadoras / Impresoras
- Contador actual de copias/impresiones
- Capacidad de bandejas
- Tipo de consumible (cartuchos/toner)
- Rendimiento estimado del toner

#### PCs / Laptops
- Procesador
- RAM
- Almacenamiento
- Sistema operativo
- Dirección IP

#### Monitores
- Tamaño en pulgadas
- Tipo de panel (IPS, LED, etc.)
- Resolución

#### Otros Equipos
- Campos genéricos definibles por el usuario

### 3. Historial de Contador

Para **impresoras y fotocopiadoras** únicamente.

Permite registrar eventos de contador con:
- Fecha de lectura (automática)
- Lectura actual del contador
- Técnico que tomó la lectura
- Observaciones

**Vista**: Tabla cronológica ordenada de más reciente a más antigua.

### 4. Historial de Mantenimiento / Servicio

Para **todos los equipos**.

Registro detallado de cada servicio realizado:
- Fecha del servicio
- Contador al momento del servicio (solo para impresoras/fotocopiadoras)
- Descripción detallada del trabajo realizado
  - Ejemplos: "Cambio de unidad de cilindro", "Limpieza general", "Cambio de cuchilla", "Calibración de colores"
- Costo del servicio
- Técnico que realizó el trabajo
- Observaciones adicionales

**Vista**: Bitácora cronológica completa del equipo.

### 5. Control de Consumibles

Para **impresoras y fotocopiadoras**.

Gestión de consumibles instalados:
- Tipo de consumible (toner negro, toner color, cilindro, revelador, tarjetas, cables, etc.)
- Fecha de instalación (automática)
- Rendimiento estimado (copias/impresiones esperadas)
- Contador antes de la instalación
- Contador para próximo cambio recomendado
- Observaciones

**Funcionalidad**: Permite planificar cambios preventivos y llevar control de costos.

---

## 🎨 Interfaz de Usuario

### Vista Principal: Listado de Equipos

**Características**:
- Tabla responsiva con columnas: Tipo, Marca/Modelo, Serie, Ubicación, Cliente, Estatus, Último Contador, Acciones
- Filtros superiores:
  - Búsqueda por texto (marca, modelo, serie, nombre, ubicación)
  - Filtro por tipo de equipo
  - Filtro por estatus
- Paginación (10 equipos por página)
- Botón "Nuevo Equipo"
- Acciones por equipo: Ver detalle, Editar, Eliminar

**Indicadores visuales**:
- Badges de color para tipos de equipo
- Badges de estado (Activo=verde, Inactivo=gris, En Reparación=amarillo, Baja=rojo)

### Vista: Formulario de Equipo

**Secciones**:

1. **Datos Generales**
   - Tipo de equipo (selección obligatoria)
   - Marca, modelo, serie
   - Nombre del equipo
   - Ubicación
   - Estatus
   - Observaciones

2. **Características Específicas** (dinámicas según tipo)
   - Sección que aparece/desaparece automáticamente
   - Campos específicos según tipo seleccionado

**Validaciones**:
- Tipo de equipo es obligatorio
- Mensajes claros de error

**Botones**:
- Guardar / Actualizar
- Cancelar (regresa al listado)

### Vista: Detalle del Equipo

**Navegación por tabs**:

#### Tab 1: Información
- Datos generales del equipo
- Características específicas (JSON formateado)
- Observaciones

#### Tab 2: Contador (solo impresoras/fotocopiadoras)
- Botón "Agregar Lectura"
- Formulario inline simple
- Tabla cronológica de historial

#### Tab 3: Mantenimiento
- Botón "Agregar Servicio"
- Formulario inline completo
- Tabla cronológica de servicios

#### Tab 4: Consumibles (solo impresoras/fotocopiadoras)
- Botón "Agregar Consumible"
- Formulario inline
- Tabla de consumibles instalados

**Acciones generales**:
- Volver al listado
- Editar equipo

---

## 🗄️ Estructura de Base de Datos

### Tabla: `equipos`

```sql
CREATE TABLE equipos (
    id SERIAL PRIMARY KEY,
    tipo_equipo VARCHAR(50) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    numero_serie VARCHAR(100),
    nombre_equipo VARCHAR(150),
    area_ubicacion VARCHAR(150),
    cliente_id INTEGER,
    estatus VARCHAR(30) DEFAULT 'activo',
    responsable_id INTEGER,
    observaciones TEXT,
    foto_url VARCHAR(500),
    fecha_alta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT true
);
```

**Relaciones**:
- `cliente_id` → `clientes.id` (FK)
- `responsable_id` → `empleados.id` (FK)

### Tabla: `equipos_caracteristicas`

```sql
CREATE TABLE equipos_caracteristicas (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL,
    caracteristicas JSONB DEFAULT '{}'::jsonb,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
);
```

**Propósito**: Almacenamiento flexible de características específicas en formato JSON.

**Ejemplo de JSON**:
```json
{
  "contador_actual": 125000,
  "capacidad_bandejas": "500 hojas",
  "tipo_consumible": "Toner",
  "rendimiento_toner": 10000
}
```

### Tabla: `equipos_historial_contador`

```sql
CREATE TABLE equipos_historial_contador (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL,
    fecha_lectura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    contador_actual INTEGER NOT NULL,
    tecnico_id INTEGER,
    observaciones TEXT,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE,
    FOREIGN KEY (tecnico_id) REFERENCES empleados(id) ON DELETE SET NULL
);
```

**Propósito**: Registro histórico de lecturas de contador.

### Tabla: `equipos_mantenimiento`

```sql
CREATE TABLE equipos_mantenimiento (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL,
    fecha_servicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    contador_servicio INTEGER,
    descripcion TEXT NOT NULL,
    costo NUMERIC(10, 2),
    tecnico_id INTEGER,
    observaciones TEXT,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE,
    FOREIGN KEY (tecnico_id) REFERENCES empleados(id) ON DELETE SET NULL
);
```

**Propósito**: Bitácora completa de mantenimientos y servicios.

### Tabla: `equipos_consumibles`

```sql
CREATE TABLE equipos_consumibles (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL,
    tipo_consumible VARCHAR(100) NOT NULL,
    fecha_instalacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rendimiento_estimado INTEGER,
    contador_instalacion INTEGER,
    contador_proximo_cambio INTEGER,
    observaciones TEXT,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
);
```

**Propósito**: Control de consumibles instalados.

### Índices Creados

```sql
-- Tabla equipos
CREATE INDEX idx_equipos_tipo ON equipos(tipo_equipo);
CREATE INDEX idx_equipos_estatus ON equipos(estatus);
CREATE INDEX idx_equipos_cliente ON equipos(cliente_id);
CREATE INDEX idx_equipos_serie ON equipos(numero_serie);

-- Tablas de historial
CREATE INDEX idx_caracteristicas_equipo ON equipos_caracteristicas(equipo_id);
CREATE INDEX idx_historial_contador_equipo ON equipos_historial_contador(equipo_id);
CREATE INDEX idx_historial_contador_fecha ON equipos_historial_contador(fecha_lectura DESC);
CREATE INDEX idx_mantenimiento_equipo ON equipos_mantenimiento(equipo_id);
CREATE INDEX idx_mantenimiento_fecha ON equipos_mantenimiento(fecha_servicio DESC);
CREATE INDEX idx_consumibles_equipo ON equipos_consumibles(equipo_id);
CREATE INDEX idx_consumibles_tipo ON equipos_consumibles(tipo_consumible);
```

---

## 🔌 API Backend

### Base URL: `/api/equipos`

**Autenticación**: Todas las rutas requieren JWT token en header `Authorization: Bearer <token>`

### Endpoints Principales

#### 1. Listar Equipos
```http
GET /api/equipos
```

**Query Parameters**:
- `q` (string): Búsqueda por texto (marca, modelo, serie, ubicación)
- `tipo` (string): Filtrar por tipo de equipo
- `estatus` (string): Filtrar por estatus
- `cliente_id` (number): Filtrar por cliente
- `page` (number): Número de página (default: 1)
- `limit` (number): Límite por página (default: 10)

**Respuesta**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

#### 2. Obtener Equipo por ID
```http
GET /api/equipos/:id
```

**Respuesta**: Equipo completo con características y relaciones.

#### 3. Crear Equipo
```http
POST /api/equipos
```

**Body**:
```json
{
  "tipo_equipo": "impresora",
  "marca": "HP",
  "modelo": "LaserJet Pro M404dn",
  "numero_serie": "ABC123456",
  "area_ubicacion": "Oficina Central",
  "estatus": "activo",
  "caracteristicas": {
    "contador_actual": 5000,
    "tipo_consumible": "Toner"
  }
}
```

#### 4. Actualizar Equipo
```http
PUT /api/equipos/:id
```

#### 5. Eliminar Equipo
```http
DELETE /api/equipos/:id
```

**Nota**: Es soft delete, solo marca `activo = false`.

### Endpoints de Historial

#### Contador

```http
POST /api/equipos/:id/contador
GET  /api/equipos/:id/contador
```

#### Mantenimiento

```http
POST /api/equipos/:id/mantenimiento
GET  /api/equipos/:id/mantenimiento
```

#### Consumibles

```http
POST /api/equipos/:id/consumibles
GET  /api/equipos/:id/consumibles
```

### Endpoint de Estadísticas

```http
GET /api/equipos/stats
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "total_activos": 42,
    "en_reparacion": 3,
    "fotocopiadoras": 12,
    "impresoras": 18,
    "pcs": 8,
    "laptops": 4
  }
}
```

---

## 🎯 Casos de Uso

### Caso 1: Registro de Nueva Fotocopiadora

1. Usuario accede a "Equipos" → "Nuevo Equipo"
2. Selecciona tipo "Fotocopiadora"
3. Completa datos generales (marca: Xerox, modelo: WorkCentre 5335)
4. Completa características específicas:
   - Contador actual: 125,000
   - Capacidad bandejas: 500 hojas
   - Tipo consumible: Toner
   - Rendimiento: 10,000 copias
5. Guarda el equipo
6. Sistema crea registro y redirige al detalle

### Caso 2: Registro de Mantenimiento

1. Usuario accede al detalle del equipo
2. Cambia al tab "Mantenimiento"
3. Clic en "Agregar Servicio"
4. Completa:
   - Descripción: "Cambio de unidad de cilindro y limpieza general"
   - Contador: 125,000
   - Costo: $1,200.00
   - Técnico: Juan Pérez
5. Guarda
6. Aparece en historial cronológico

### Caso 3: Instalación de Consumible

1. Usuario accede al detalle
2. Tab "Consumibles" → "Agregar Consumible"
3. Completa:
   - Tipo: Toner Negro
   - Contador instalación: 125,000
   - Rendimiento: 10,000
   - Próximo cambio: 135,000
4. Guarda
5. Sistema registra y calcula alertas

---

## 🔒 Permisos y Roles

### Módulo: `equipos`

**Roles con acceso completo**:
- **Administrador**: CRUD completo
- **Gestor de Inventarios**: CRUD completo

**Roles con acceso limitado**:
- **Supervisor**: Solo lectura y edición
- **Técnico**: Solo lectura

**Configuración en `rolesSystem.js`**:
```javascript
MODULOS.EQUIPOS = 'equipos';

ROLES_SISTEMA.ADMINISTRADOR.permisos[MODULOS.EQUIPOS] = [
  PERMISOS.LEER, 
  PERMISOS.CREAR, 
  PERMISOS.EDITAR, 
  PERMISOS.ELIMINAR
];
```

---

## 📊 Mejoras Futuras Propuestas

- [ ] Alertas automáticas cuando contador se acerca al próximo cambio de consumible
- [ ] Generación de reportes de costos de mantenimiento
- [ ] Calendario de mantenimientos preventivos
- [ ] Adjuntar archivos (facturas, garantías) a cada equipo
- [ ] Dashboard con estadísticas de equipos
- [ ] Exportación de historial a PDF/Excel
- [ ] QR codes para identificación rápida de equipos
- [ ] Notificaciones por correo de mantenimientos programados
- [ ] Integración con módulo de inventarios para consumibles
- [ ] Aplicación móvil para técnicos en campo

---

## 📞 Soporte

Para reportar problemas o sugerir mejoras en este módulo, contactar al equipo de desarrollo.

---

**Documentación actualizada**: 30 de noviembre de 2025  
**Versión del módulo**: 1.0.0
