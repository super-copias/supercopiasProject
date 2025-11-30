# Módulo de Proveedores - Sistema SuperCopias

## Descripción Funcional del Módulo

El módulo de Proveedores permite gestionar de manera completa el catálogo de proveedores de la empresa, facilitando el registro, consulta, actualización y administración de la información de contacto, dirección y condiciones de pago.

---

## 📋 Pantallas del Módulo

### 1. Lista de Proveedores (Pantalla Principal)

**Objetivo**: Visualizar todos los proveedores registrados con capacidad de búsqueda, filtrado y acciones rápidas.

**Elementos visuales**:
- **Encabezado**: Título "Proveedores" con botón destacado "Nuevo"
- **Barra de búsqueda**: Campo de texto para buscar por:
  - Nombre comercial
  - RFC
  - Nombre de contacto
  - Email
  - Teléfono
- **Tabla de datos** con las siguientes columnas:
  - Nombre Comercial (principal, siempre visible)
  - RFC (oculto en móvil)
  - Tipo (Productos/Servicios/Mixto - oculto en tabletas pequeñas)
  - Contacto principal (oculto en pantallas pequeñas)
  - Teléfono (oculto en móvil)
  - Estatus (Activo/Inactivo con badge de color)
  - Acciones (botones Ver, Editar, Eliminar)

**Acciones disponibles**:
- **Buscar**: Filtrar proveedores en tiempo real
- **Nuevo**: Abrir formulario de registro
- **Ver detalles**: Mostrar información completa en modal
- **Editar**: Abrir formulario con datos precargados
- **Desactivar**: Cambiar estatus a inactivo (con confirmación)

**Paginación**:
- 10 registros por página (configurable)
- Botones: Anterior / Siguiente
- Indicador: "Página X de Y"
- Total de registros mostrado

---

### 2. Formulario de Proveedor

**Objetivo**: Crear nuevo proveedor o editar uno existente con todos sus datos organizados por secciones.

#### **Sección 1: Datos Generales**
- **Nombre Comercial** ⭐ (requerido)
  - Campo de texto
  - Ejemplo: "Papelería El Estudiante"
- **Razón Social**
  - Campo de texto
  - Ejemplo: "Papelería El Estudiante S.A. de C.V."
- **RFC**
  - Campo de texto (mayúsculas automáticas)
  - Máximo 13 caracteres
  - Validación de formato
- **Tipo de Proveedor** ⭐ (requerido)
  - Select con opciones:
    - Productos
    - Servicios
    - Mixto
- **Estatus**
  - Checkbox (Activo/Inactivo)
  - Badge visual según estado

#### **Sección 2: Datos de Contacto**
- **Nombre de Contacto**
  - Persona principal de contacto
- **Teléfono**
  - Número de contacto
- **Correo Electrónico**
  - Validación de formato email
- **Página Web**
  - URL opcional

#### **Sección 3: Dirección**
- **Dirección Completa**
  - Campo de texto único para dirección completa
  - Botón de integración con Google Maps
  - **Funcionalidad de Google Maps**:
    1. Botón con ícono de mapa al lado del campo
    2. Al hacer clic, se despliega panel expandible con:
       - Campo de búsqueda para localizar dirección
       - Botón "Abrir Maps" que abre Google Maps en nueva ventana
       - Campo de texto para pegar la dirección exacta desde Google Maps
       - Al presionar Enter, la dirección se aplica automáticamente
  - Placeholder: "Escriba la dirección completa o seleccione en el mapa"
  - Ejemplo: "Av. Universidad 123, Col. Centro, Ciudad de México, CDMX, 06000, México"

#### **Sección 4: Datos de Pago**
- **Método de Pago Principal**
  - Select con opciones:
    - Efectivo
    - Transferencia bancaria
    - Cheque
    - Tarjeta de crédito/débito
    - Otro
- **Cuenta Bancaria/CLABE**
  - Campo opcional para referencia
- **Días de Crédito**
  - Número entero (0 = contado)
  - Ejemplo: 30 días

#### **Sección 5: Notas Internas**
- **Notas**
  - Área de texto libre
  - Para información adicional relevante

**Botones de acción**:
- **Guardar/Actualizar**: Guardar cambios
- **Cancelar**: Regresar sin guardar

**Validaciones**:
- Nombre comercial no puede estar vacío
- Tipo de proveedor es obligatorio
- RFC debe tener formato válido si se proporciona
- Email debe tener formato válido si se proporciona
- RFC único (no puede duplicarse entre proveedores activos)

---

### 3. Modal de Detalles

**Objetivo**: Mostrar toda la información del proveedor en formato de solo lectura, organizada y clara.

**Organización en tarjetas**:

1. **Información General**
   - Nombre Comercial
   - Razón Social
   - RFC (con badge)
   - Tipo (con badge de color)
   - Estatus (Activo/Inactivo)

2. **Contacto**
   - Persona de contacto
   - Teléfono
   - Email
   - Página Web (con enlace externo)

3. **Dirección**
   - Calle y Número
   - Colonia
   - Ciudad, Estado
   - Código Postal
   - País

4. **Datos de Pago**
   - Método de pago principal
   - Cuenta bancaria
   - Días de crédito (con badge)

5. **Notas Internas**
   - Texto completo de observaciones

**Botones**:
- **Imprimir**: Generar documento imprimible
- **Cerrar**: Volver a la lista

---

## 🎨 Diseño y Estética

### Colores y Badges

- **Tipo Productos**: Badge azul (`bg-primary`)
- **Tipo Servicios**: Badge celeste (`bg-info`)
- **Tipo Mixto**: Badge verde (`bg-success`)
- **Activo**: Badge verde (`bg-success`)
- **Inactivo**: Badge rojo (`bg-danger`)
- **RFC**: Badge gris (`bg-secondary`)

### Iconos FontAwesome

- Proveedores: `fa-truck`
- Edificio/Empresa: `fa-building`
- Contacto: `fa-address-book`
- Dirección: `fa-map-marked-alt`
- Pago: `fa-credit-card`
- Notas: `fa-sticky-note`
- Agregar: `fa-plus`
- Editar: `fa-edit`
- Ver: `fa-eye`
- Eliminar: `fa-trash`
- Buscar: `fa-search`
- Imprimir: `fa-print`

### Responsividad

- **Móvil** (< 576px): Solo nombre comercial, estatus y acciones
- **Tablet** (576px - 992px): Agrega RFC y teléfono
- **Desktop** (> 992px): Muestra todas las columnas

---

## 📊 Flujo de Uso

### Registrar Nuevo Proveedor

1. Usuario hace clic en "Nuevo"
2. Se abre formulario vacío con valores por defecto:
   - Tipo: Mixto
   - Estatus: Activo
   - País: México
   - Días de crédito: 0
3. Usuario llena campos requeridos (⭐)
4. Usuario llena campos opcionales según necesidad
5. Click en "Guardar"
6. Sistema valida:
   - Campos requeridos completos
   - RFC único (si se proporcionó)
   - Formatos correctos (email, RFC)
7. Si todo OK:
   - Mensaje de éxito
   - Regresa a lista
   - Proveedor aparece en la tabla
8. Si hay error:
   - Mensaje claro de error
   - Usuario corrige y reintenta

### Consultar Proveedores

1. Usuario accede a "Proveedores" desde menú
2. Se muestra lista con proveedores activos
3. Usuario puede:
   - Ver lista completa (paginada)
   - Buscar por texto
   - Ordenar por columnas
   - Ver detalles (click en ojo)
   - Editar directamente

### Actualizar Proveedor

1. Usuario hace clic en "Editar" (icono lápiz)
2. Se abre formulario con datos actuales precargados
3. Usuario modifica campos necesarios
4. Click en "Actualizar"
5. Sistema valida cambios
6. Mensaje de confirmación
7. Regresa a lista actualizada

### Eliminar/Desactivar Proveedor

1. Usuario hace clic en "Eliminar" (icono basura)
2. Sistema muestra confirmación:
   > "¿Desea desactivar a [Nombre]?"
   > "El proveedor se marcará como inactivo."
3. Usuario confirma
4. Sistema cambia estatus a Inactivo
5. Mensaje de éxito
6. Proveedor desaparece de lista (solo activos)
7. Puede reactivarse editándolo

---

## 💾 Datos Almacenados

### Estructura de Base de Datos

#### Tabla Principal: `proveedores`
```sql
CREATE TABLE proveedores (
  id SERIAL PRIMARY KEY,
  nombre_comercial VARCHAR(500) NOT NULL,
  razon_social VARCHAR(500),
  rfc VARCHAR(13),
  tipo_proveedor VARCHAR(50) DEFAULT 'Mixto',
  activo BOOLEAN DEFAULT true,
  nombre_contacto VARCHAR(255),
  telefono VARCHAR(20),
  email VARCHAR(255),
  pagina_web VARCHAR(500),
  direccion TEXT,  -- Campo único para dirección completa
  metodo_pago_principal VARCHAR(100),
  cuenta_bancaria VARCHAR(50),
  dias_credito INTEGER DEFAULT 0,
  notas TEXT,
  fecha_registro TIMESTAMP DEFAULT NOW(),
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);
```

#### Tablas de Catálogos

**Catálogo de Tipos de Proveedor**: `cat_tipos_proveedor`
```sql
CREATE TABLE cat_tipos_proveedor (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(200) NOT NULL,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);
```

**Catálogo de Métodos de Pago**: `cat_metodos_pago_proveedor`
```sql
CREATE TABLE cat_metodos_pago_proveedor (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(200) NOT NULL,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_modificacion TIMESTAMP DEFAULT NOW()
);
```

**Índices para búsqueda rápida**:
- nombre_comercial
- rfc
- email
- tipo_proveedor
- activo

---

## ✅ Validaciones y Reglas de Negocio

1. **Nombre Comercial**:
   - Requerido
   - Mínimo 3 caracteres
   - Máximo 500 caracteres

2. **RFC**:
   - Opcional
   - Si se proporciona: 12 o 13 caracteres
   - Solo letras, números y &
   - Convertir automáticamente a mayúsculas
   - Debe ser único entre proveedores activos

3. **Email**:
   - Opcional
   - Formato válido: usuario@dominio.ext

4. **Tipo de Proveedor**:
   - Requerido
   - Solo: Productos, Servicios o Mixto

5. **Días de Crédito**:
   - Número entero
   - Mínimo: 0
   - Máximo razonable: 365

6. **Eliminación**:
   - No se elimina físicamente
   - Solo se desactiva (activo = false)
   - Sugerencia al usuario: "Recomendamos desactivar en lugar de eliminar"

---

## 📱 Mensajes al Usuario

### Mensajes de Éxito

- "Proveedor creado correctamente"
- "Proveedor actualizado correctamente"
- "El proveedor [Nombre] ha sido desactivado correctamente"

### Mensajes de Error

- "El nombre comercial es requerido"
- "El tipo de proveedor es requerido"
- "El formato del RFC es inválido"
- "Ya existe un proveedor con este RFC"
- "El formato del correo electrónico es inválido"
- "Error al guardar el proveedor. Intente nuevamente"

### Mensajes de Advertencia

- "El campo [nombre] no puede estar vacío"
- "RFC debe tener 12 o 13 caracteres"

---

## 🔍 Funcionalidades Adicionales

### Búsqueda Inteligente

La búsqueda funciona en:
- Nombre comercial
- Razón social
- RFC
- Nombre de contacto
- Email
- Teléfono

**Ejemplo**: Buscar "papelería" mostrará todos los proveedores que tengan esa palabra en cualquiera de los campos mencionados.

### Impresión

Al hacer clic en "Imprimir" desde el modal de detalles:
1. Se abre nueva ventana con formato de impresión
2. Incluye logo de SuperCopias
3. Datos organizados en secciones claras
4. Fecha y hora de impresión
5. Se puede guardar como PDF

---

## 📈 Estadísticas (Futuro)

Datos útiles que se pueden obtener:

- Total de proveedores activos
- Proveedores por tipo (Productos/Servicios/Mixto)
- Proveedores con más días de crédito
- Métodos de pago más usados
- Nuevos proveedores por mes

---

## 🎯 Resumen de Beneficios

1. **Simplicidad**: Formulario intuitivo organizado por secciones
2. **Rapidez**: Búsqueda instantánea y acciones directas
3. **Claridad**: Datos bien organizados y etiquetados
4. **Flexibilidad**: Campos opcionales adaptables a cada caso
5. **Seguridad**: Validaciones que previenen errores
6. **Trazabilidad**: Fechas de registro y modificación automáticas
7. **Organización**: Diferentes tipos de proveedores identificables
8. **Control**: Desactivación en lugar de eliminación definitiva

---

## 🚀 Implementación Técnica

### Backend (Node.js + PostgreSQL)
- ✅ Tabla `proveedores` actualizada con todos los campos
- ✅ Controlador con endpoints CRUD completos
- ✅ Validaciones de negocio en servidor
- ✅ Catálogos para tipos y métodos de pago
- ✅ Búsqueda y paginación optimizadas

### Frontend (Angular)
- ✅ Componente de lista con tabla responsiva
- ✅ Componente de formulario multi-sección
- ✅ Componente de tabla con modal de detalles
- ✅ Servicio con llamadas API
- ✅ Interfaz TypeScript actualizada
- ✅ Validaciones en frontend

---

**Fecha de implementación**: 29 de noviembre de 2025  
**Versión del sistema**: SuperCopias v1.0  
**Módulo**: Proveedores - Gestión Completa
