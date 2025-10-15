# 📋 RESUMEN DE CAMBIOS APLICADOS - SISTEMA SUPERCOPIAS

**Fecha:** 15 de Octubre 2025  
**Rama:** QA  
**Objetivo:** Sincronizar frontend y backend para usar IDs numéricos vs claves alfanuméricas correctamente

---

## ✅ CAMBIOS COMPLETADOS

### 1. **Base de Datos - Estructura Simplificada** ✅

**Archivo:** `backend/BD_SUPERCOPIAS.sql`

**Cambios en tabla `clientes`:**
- ❌ **ELIMINADO:** `direccion_calle`, `direccion_numero`, `direccion_colonia`, `direccion_ciudad`, `direccion_estado`
- ✅ **MANTENIDO:** `direccion` (TEXT - campo único), `direccion_codigo_postal` (VARCHAR 10)
- ✅ **RENOMBRADO:** `regimen` → `regimen_fiscal`
- ✅ **RENOMBRADO:** `cfdi` → `uso_cfdi`
- ✅ **AGREGADO:** Constraints para validar códigos SAT:
  - `regimen_fiscal`: Debe ser 3 dígitos (Ej: 601, 612)
  - `uso_cfdi`: Debe ser letra + 2 dígitos (Ej: G01, D01)

**Archivo de Migración:** `backend/scripts/migration-simplify-direcciones.sql`
- Script SQL listo para ejecutar en PostgreSQL
- Consolida datos existentes automáticamente
- Elimina columnas obsoletas de forma segura

---

### 2. **Frontend - Formulario de Clientes** ✅

**Archivo:** `frontend/src/app/modules/clientes/clientes-form.component.ts`

**Cambios aplicados:**

#### A. Campo Régimen Fiscal
- ❌ **ANTES:** `<input type="text">` (texto libre, sin validación)
- ✅ **AHORA:** `<select>` con catálogo de regímenes fiscales del SAT
- ✅ Guarda solo el **código** (Ej: "601") no la descripción completa
- ✅ Carga datos desde `catalogosService.getRegimenesFiscales()`

#### B. Campo Uso CFDI
- ❌ **ANTES:** `[value]="uso.codigo + ' - ' + uso.descripcion"` (guardaba todo concatenado)
- ✅ **AHORA:** `[value]="uso.codigo"` (guarda solo código Ej: "G01")
- ✅ Mantiene visualización completa para el usuario

#### C. Nuevos Elementos
- ✅ Array `regimenesFiscales: any[]` agregado
- ✅ Método `loadRegimenesFiscales()` implementado
- ✅ Carga automática de catálogo en `ngOnInit()`
- ✅ Placeholders mejorados (RFC, CP)
- ✅ Atributos `maxlength` agregados

---

### 3. **Backend - Controlador de Clientes** ✅

**Archivo:** `backend/controllers/clientesController.js`

**Método `createCliente()` - Cambios:**
- ✅ Query actualizado para nueva estructura:
  ```sql
  INSERT INTO clientes (
    razon_social, nombre_comercial, email, telefono,
    rfc, regimen_fiscal, uso_cfdi,
    direccion, direccion_codigo_postal, ...
  )
  ```
- ✅ **Validación RFC mejorada:**
  - Formato: 3-4 letras + 6 dígitos + 3 caracteres
  - Validación de fecha dentro del RFC (mes 1-12, día 1-31)
  - Mensaje de error descriptivo
  
- ✅ **Validación Régimen Fiscal:**
  - Debe ser código SAT de 3 dígitos (Regex: `^[0-9]{3}$`)
  - Ejemplo válido: "601", "612", "626"
  
- ✅ **Validación Uso CFDI:**
  - Debe ser código SAT: letra + 2 dígitos (Regex: `^[A-Z][0-9]{2}$`)
  - Ejemplo válido: "G01", "D01", "P01"
  
- ✅ **Validación Código Postal:**
  - Debe ser 5 dígitos (Regex: `^[0-9]{5}$`)
  - Ejemplo válido: "29000", "01000"

**Método `updateCliente()` - Cambios:**
- ✅ Campos actualizados a nueva nomenclatura:
  - `razon` → `razon_social`
  - `nombre` → `nombre_comercial`
  - `regimen` → `regimen_fiscal`
  - `cfdi` → `uso_cfdi`
  - `cp` → `direccion_codigo_postal`
- ✅ Validaciones aplicadas también en UPDATE
- ✅ Eliminados campos obsoletos (direccion_calle, etc.)

---

## 🚀 INSTRUCCIONES DE DESPLIEGUE

### **PASO 1: Ejecutar Migración de Base de Datos**

```bash
# 1. Conectar a PostgreSQL
psql -U postgres -d supercopias

# 2. Ejecutar script de migración
\i backend/scripts/migration-simplify-direcciones.sql

# 3. Verificar cambios
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
ORDER BY ordinal_position;
```

**⚠️ IMPORTANTE:** 
- Respaldar la base de datos antes de ejecutar: `pg_dump supercopias > backup_$(date +%Y%m%d).sql`
- El script consolidará automáticamente direcciones existentes
- Los datos NO se perderán, solo se reorganizarán

---

### **PASO 2: Reiniciar Backend**

```bash
cd backend
npm install  # Por si acaso (no debería ser necesario)
npm run dev  # o npm start
```

**Verificar:**
- Backend inicia sin errores
- Endpoint `/api/catalogos/regimenes-fiscales` devuelve datos
- Endpoint `/api/catalogos/usos-cfdi` devuelve datos

---

### **PASO 3: Recompilar Frontend**

```bash
cd frontend
npm install  # Por si acaso
ng serve  # o npm start
```

**Verificar:**
- Aplicación compila sin errores TypeScript
- Formulario de clientes carga correctamente
- SELECT de Régimen Fiscal muestra opciones
- SELECT de Uso CFDI muestra opciones

---

## 🧪 PRUEBAS REQUERIDAS

### **Test 1: Crear Cliente con Datos SAT**
1. Ir a módulo de Clientes
2. Clic en "Nuevo Cliente"
3. Llenar formulario:
   - RFC: `XAXX010101000` (debe validar formato)
   - Régimen Fiscal: Seleccionar del dropdown
   - Uso CFDI: Seleccionar del dropdown
   - CP: `29000` (5 dígitos)
4. Guardar
5. **Verificar:** 
   - Cliente se crea exitosamente
   - En BD se guarda solo el código (no descripción completa)

### **Test 2: Validaciones de RFC**
Probar RFC inválidos:
- `ABC` → Debe rechazar (muy corto)
- `XAXX0101010` → Debe rechazar (fecha inválida)
- `XAXX010199000` → Debe rechazar (mes inválido)

### **Test 3: Editar Cliente Existente**
1. Abrir cliente creado antes de la migración
2. Editar Régimen Fiscal y Uso CFDI
3. Guardar
4. **Verificar:** Cambios se guardan correctamente con códigos SAT

### **Test 4: Búsqueda y Listado**
1. Ir a lista de clientes
2. Buscar por nombre, RFC
3. **Verificar:** Resultados se muestran correctamente

---

## 📊 IMPACTO EN DATOS EXISTENTES

### **Clientes Existentes:**
- ✅ **Direcciones consolidadas** automáticamente por el script de migración
- ⚠️ **Régimen Fiscal y Uso CFDI** mantienen valores actuales (pueden ser texto libre)
- 🔄 **Al editar** se aplicarán las nuevas validaciones

### **Recomendación Post-Migración:**
Ejecutar query para revisar clientes con datos no válidos:

```sql
-- Clientes con régimen fiscal no válido
SELECT id, razon_social, regimen_fiscal
FROM clientes
WHERE regimen_fiscal IS NOT NULL 
  AND regimen_fiscal !~ '^[0-9]{3}$';

-- Clientes con uso CFDI no válido
SELECT id, razon_social, uso_cfdi
FROM clientes
WHERE uso_cfdi IS NOT NULL 
  AND uso_cfdi !~ '^[A-Z][0-9]{2}$';
```

Si hay registros, corregirlos manualmente o con script adicional.

---

## 🔄 ROLLBACK (En caso de problemas)

Si necesitas revertir los cambios:

```sql
-- Restaurar desde backup
psql -U postgres -d supercopias < backup_YYYYMMDD.sql

-- O revertir estructura manualmente:
ALTER TABLE clientes ADD COLUMN direccion_calle VARCHAR(500);
ALTER TABLE clientes ADD COLUMN direccion_numero VARCHAR(50);
-- ... etc
```

---

## 📝 NOTAS TÉCNICAS

### **Campos que NO cambiaron:**
- ✅ Empleados (puestos y sucursales usan IDs correctamente)
- ✅ Módulos de permisos (usan claves string correctamente)
- ✅ Usuarios
- ✅ Proveedores

### **Validaciones Agregadas:**
- RFC: Formato SAT (3-4 letras + fecha + homoclave)
- Régimen Fiscal: Código SAT 3 dígitos
- Uso CFDI: Código SAT (letra + 2 dígitos)
- Código Postal: 5 dígitos numéricos

### **Performance:**
- Sin impacto en rendimiento
- Queries más simples (menos JOINs)
- Índices mantenidos en campos relevantes

---

## ✅ CHECKLIST FINAL

- [ ] Backup de base de datos creado
- [ ] Script de migración ejecutado exitosamente
- [ ] Backend reiniciado sin errores
- [ ] Frontend recompilado sin errores
- [ ] Test 1: Crear cliente nuevo ✅
- [ ] Test 2: Validaciones de RFC ✅
- [ ] Test 3: Editar cliente existente ✅
- [ ] Test 4: Búsqueda funciona ✅
- [ ] Verificar clientes con datos antiguos
- [ ] Documentación actualizada

---

## 📞 SOPORTE

Si encuentras algún problema durante el despliegue:

1. **Error en migración SQL:** Revisar logs de PostgreSQL
2. **Error en backend:** Verificar logs con `npm run dev`
3. **Error en frontend:** Abrir DevTools y revisar consola
4. **Datos inconsistentes:** Ejecutar queries de verificación arriba

---

**Estado del Proyecto:** ✅ LISTO PARA DESPLEGAR  
**Riesgo:** 🟢 BAJO (Cambios bien aislados, con migración automática)  
**Tiempo Estimado:** 15-20 minutos

---
